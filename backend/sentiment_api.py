# backend\sentiment_api.py

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline
from typing import List, Optional
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv
import pandas as pd
import io
from collections import Counter

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Sentiment Analysis API")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Your Next.js URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://bhargavswntb_db_user:IN1XKHhELmPZYZeG@cluster0.o2juj0x.mongodb.net/?appName=Cluster0")
client = MongoClient(MONGODB_URI)
db = client["sentiment_db"]
reviews_collection = db["reviews"]
corrections_collection = db["corrections"]
training_queue_collection = db["training_queue"]

# Load Simplified KeyBERT ABSA System (loads once when server starts)
print("Loading Simplified KeyBERT ABSA System...")
from keybert_absa import SimplifiedABSA

MODEL_PATH = "./my_finetuned_sentiment_model"
hybrid_analyzer = SimplifiedABSA(sentiment_model_path=MODEL_PATH)
print("Simplified KeyBERT ABSA System ready!")

# ============================================
# Pydantic Models (Request/Response schemas)
# ============================================

class ReviewInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    product_id: Optional[str] = None
    user_id: Optional[str] = None  # This will be the user's email

class BatchReviewInput(BaseModel):
    reviews: List[str] = Field(..., max_items=100)

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float
    label_scores: dict

class ReviewResponse(BaseModel):
    id: str
    text: str
    sentiment: str
    confidence: float
    timestamp: str
    user_id: Optional[str] = None

# Active Learning Models
class CorrectionInput(BaseModel):
    review_id: str
    user_email: str
    original_sentiment: str
    corrected_sentiment: str
    confidence_override: float = Field(ge=0, le=1)
    aspects: List[str]
    status: str = "draft"  # "draft" | "pending_admin_review" | "approved" | "rejected"

class CorrectionUpdate(BaseModel):
    corrected_sentiment: Optional[str] = None
    confidence_override: Optional[float] = Field(None, ge=0, le=1)
    aspects: Optional[List[str]] = None
    status: Optional[str] = None

class AdminReviewInput(BaseModel):
    admin_email: str
    notes: Optional[str] = None

# ============================================
# Helper Functions
# ============================================

def predict_sentiment(text: str) -> dict:
    """
    Predict sentiment for a single text using the fine-tuned model
    """
    # Use the sentiment model from SimplifiedABSA
    result = hybrid_analyzer.sentiment_model(text)[0]
    
    # Map labels to readable names
    label_map = {
        'LABEL_0': 'negative',
        'LABEL_1': 'neutral', 
        'LABEL_2': 'positive'
    }
    
    sentiment = label_map.get(result['label'], result['label'])
    
    return {
        'sentiment': sentiment,
        'confidence': result['score'],
        'raw_label': result['label']
    }

def predict_batch(texts: List[str]) -> List[dict]:
    """
    Predict sentiment for multiple texts
    """
    results = hybrid_analyzer.sentiment_model(texts, batch_size=32)
    
    label_map = {
        'LABEL_0': 'negative',
        'LABEL_1': 'neutral', 
        'LABEL_2': 'positive'
    }
    
    predictions = []
    for text, result in zip(texts, results):
        predictions.append({
            'text': text,
            'sentiment': label_map.get(result['label'], result['label']),
            'confidence': result['score']
        })
    
    return predictions

# ============================================
# API Endpoints
# ============================================

@app.get("/")
def root():
    return {
        "message": "Sentiment Analysis API with Simplified KeyBERT ABSA",
        "version": "4.0",
        "features": [
            "Simplified KeyBERT-only aspect extraction",
            "MMR algorithm for better context awareness",
            "20+ aspects automatically detected",
            "Works on any domain (products, food, travel, etc.)",
            "Faster processing with fewer dependencies",
            "Single review analysis",
            "Bulk review analysis",
            "Active Learning with user corrections"
        ],
        "endpoints": [
            "/analyze-single - Analyze single review with 20+ aspects",
            "/upload-reviews - Bulk analysis from CSV/Excel",
            "/predict - Legacy single sentiment prediction",
            "/batch-predict - Legacy batch prediction",
            "/reviews - Get stored reviews",
            "/stats - Get sentiment statistics",
            "/corrections - Active learning corrections",
            "/admin/* - Admin endpoints for review/training"
        ]
    }

@app.post("/predict", response_model=SentimentResponse)
def predict_single(review: ReviewInput):
    """
    Predict sentiment for a single review
    """
    try:
        result = predict_sentiment(review.text)
        
        return SentimentResponse(
            text=review.text,
            sentiment=result['sentiment'],
            confidence=round(result['confidence'], 4),
            label_scores={
                'negative': 0.0,
                'neutral': 0.0,
                'positive': 0.0
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-predict")
def predict_multiple(batch: BatchReviewInput):
    """
    Predict sentiment for multiple reviews at once
    """
    try:
        results = predict_batch(batch.reviews)
        return {"predictions": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-review", response_model=ReviewResponse)
def save_review_with_sentiment(review: ReviewInput):
    """
    Analyze sentiment and save to MongoDB with user email
    """
    try:
        # Predict sentiment
        result = predict_sentiment(review.text)
        
        # Create document with user_id (email)
        document = {
            "text": review.text,
            "sentiment": result['sentiment'],
            "confidence": result['confidence'],
            "product_id": review.product_id,
            "user_id": review.user_id,
            "timestamp": datetime.utcnow(),
            "raw_label": result['raw_label']
        }
        
        # Insert into MongoDB
        insert_result = reviews_collection.insert_one(document)
        document['_id'] = str(insert_result.inserted_id)
        
        return ReviewResponse(
            id=document['_id'],
            text=document['text'],
            sentiment=document['sentiment'],
            confidence=round(document['confidence'], 4),
            timestamp=document['timestamp'].isoformat(),
            user_id=document.get('user_id')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-single")
async def analyze_single_with_aspects(review: ReviewInput):
    """
    Analyze single review with Simplified KeyBERT ABSA (20+ aspects)
    Returns: overall sentiment + detected aspects with their sentiments
    """
    try:
        # Analyze with Simplified KeyBERT ABSA
        result = hybrid_analyzer.analyze_single_review(review.text, top_n=20)
        
        # Prepare response
        response_data = {
            "text": review.text,
            "sentiment": result['overall_sentiment'],
            "confidence": result['overall_confidence'],
            "aspects": result['aspects'],
            "total_aspects_found": result['total_aspects_found'],
            "saved": False
        }
        
        # Save to MongoDB if user_id provided
        if review.user_id:
            document = {
                "text": review.text,
                "sentiment": result['overall_sentiment'],
                "confidence": result['overall_confidence'],
                "aspects": result['aspects'],
                "total_aspects_found": result['total_aspects_found'],
                "product_id": review.product_id,
                "user_id": review.user_id,
                "analysis_type": "single",
                "extraction_method": "keybert_absa",
                "timestamp": datetime.utcnow()
            }
            
            reviews_collection.insert_one(document)
            response_data["saved"] = True
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-reviews")
async def upload_reviews_file(
    file: UploadFile = File(...),
    product_name: str = Form(...),
    user_id: str = Form(...),
    save_to_db: bool = Form(True)
):
    """
    Upload CSV/Excel file with reviews and return bulk analysis with Simplified KeyBERT ABSA (20+ aspects)
    """
    try:
        # Read file content
        contents = await file.read()
        
        # Determine file type and read accordingly
        file_extension = file.filename.split('.')[-1].lower()
        
        if file_extension == 'csv':
            df = pd.read_csv(io.BytesIO(contents))
        elif file_extension in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return {
                "success": False,
                "error": "Unsupported file format. Please upload CSV or Excel file."
            }
        
        # Find review column (flexible column names)
        review_column = None
        possible_names = ['review', 'review_text', 'text', 'reviews', 'comment', 'feedback']
        
        for col in df.columns:
            if col.lower() in possible_names:
                review_column = col
                break
        
        if review_column is None:
            # If no matching column, use first column
            review_column = df.columns[0]
        
        # Extract reviews and clean
        reviews = df[review_column].dropna().astype(str).tolist()
        
        if len(reviews) == 0:
            return {
                "success": False,
                "error": "No reviews found in the file."
            }
        
        # Limit to prevent overload
        MAX_REVIEWS = 1000
        truncated = False
        if len(reviews) > MAX_REVIEWS:
            reviews = reviews[:MAX_REVIEWS]
            truncated = True
        
        # Analyze all reviews with Simplified KeyBERT ABSA
        print(f"\n{'='*60}")
        print(f"🚀 BULK ANALYSIS STARTED (KeyBERT)")
        print(f"{'='*60}")
        
        aggregated = hybrid_analyzer.analyze_bulk_reviews(reviews, product_name, top_n=20)
        
        # Get individual results for display
        individual_results = []
        for i, review_text in enumerate(reviews[:50]):  # Limit to first 50 for response size
            if len(review_text.strip()) > 0:
                result = hybrid_analyzer.analyze_single_review(review_text, top_n=5)
                individual_results.append({
                    "text": review_text,
                    "overall_sentiment": result['overall_sentiment'],
                    "overall_confidence": result['overall_confidence'],
                    "aspects": result['aspects'][:3]  # Top 3 aspects per review
                })
        
        # Save to MongoDB if requested
        if save_to_db:
            reviews_collection.insert_one({
                "user_id": user_id,
                "product_name": product_name,
                "analysis_type": "bulk",
                "extraction_method": "keybert_absa",
                "total_reviews": len(reviews),
                "file_name": file.filename,
                "aggregated_results": aggregated,
                "timestamp": datetime.utcnow(),
                "truncated": truncated
            })
        
        print(f"{'='*60}")
        print(f"✅ BULK ANALYSIS COMPLETED")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "message": f"Analyzed {len(reviews)} reviews successfully with Simplified KeyBERT ABSA",
            "truncated": truncated,
            "results": aggregated,
            "individual_results": individual_results
        }
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
        return {
            "success": False,
            "error": f"Error processing file: {str(e)}"
        }

@app.get("/reviews")
def get_reviews(
    limit: int = 50, 
    sentiment: Optional[str] = None,
    product_id: Optional[str] = None,
    user_email: Optional[str] = None
):
    """
    Get reviews from database with optional filters
    """
    try:
        query = {}
        if sentiment:
            query['sentiment'] = sentiment
        if product_id:
            query['product_id'] = product_id
        if user_email:
            query['user_id'] = user_email
        
        reviews = list(reviews_collection.find(query).sort("timestamp", -1).limit(limit))
        
        # Convert ObjectId to string
        for review in reviews:
            review['_id'] = str(review['_id'])
            review['timestamp'] = review['timestamp'].isoformat()
        
        return {"reviews": reviews, "count": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
def get_sentiment_stats(
    product_id: Optional[str] = None,
    user_email: Optional[str] = None
):
    """
    Get sentiment statistics
    """
    try:
        query = {}
        if product_id:
            query['product_id'] = product_id
        if user_email:
            query['user_id'] = user_email
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$sentiment",
                "count": {"$sum": 1},
                "avg_confidence": {"$avg": "$confidence"}
            }}
        ]
        
        results = list(reviews_collection.aggregate(pipeline))
        
        stats = {
            'positive': 0,
            'neutral': 0,
            'negative': 0,
            'total': 0
        }
        
        for result in results:
            sentiment = result['_id']
            stats[sentiment] = result['count']
            stats['total'] += result['count']
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/reviews/{review_id}")
def delete_review(review_id: str):
    """
    Delete a review by ID
    """
    try:
        result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {"message": "Review deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reviews/user/{user_email}")
def get_user_reviews(user_email: str, limit: int = 50):
    """
    Get all reviews for a specific user
    """
    try:
        reviews = list(
            reviews_collection.find({"user_id": user_email})
            .sort("timestamp", -1)
            .limit(limit)
        )
        
        for review in reviews:
            review['_id'] = str(review['_id'])
            review['timestamp'] = review['timestamp'].isoformat()
        
        return {"reviews": reviews, "count": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/corrections")
async def create_correction(correction: CorrectionInput):
    """
    Create a new correction (draft or pending_admin_review)
    """
    try:
        doc = correction.dict()
        doc["created_at"] = datetime.utcnow()
        doc["updated_at"] = datetime.utcnow()
        # Ensure _id is not set; Mongo will generate it
        if "_id" in doc:
            del doc["_id"]
        
        result = corrections_collection.insert_one(doc)
        return {
            "success": True,
            "id": str(result.inserted_id),
            "message": f"Correction {doc['status']} created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW: GET /admin/corrections (for admin to fetch/filter pending corrections)
@app.get("/admin/corrections")
async def get_admin_corrections(status: Optional[str] = None, limit: int = 50):
    """
    Get corrections filtered by status (e.g., pending_admin_review)
    """
    try:
        query = {}
        if status:
            query["status"] = status
        
        # Optional: Join with review text for richer data
        corrections = list(
            corrections_collection.find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        
        for correction in corrections:
            correction["_id"] = str(correction["_id"])
            if "created_at" in correction:
                correction["created_at"] = correction["created_at"].isoformat()
            if "updated_at" in correction:
                correction["updated_at"] = correction["updated_at"].isoformat()
            # Fetch review text if review_id exists (optional enrichment)
            if "review_id" in correction:
                review = reviews_collection.find_one({"_id": ObjectId(correction["review_id"])})
                if review:
                    correction["review_text"] = review.get("text", "Review text unavailable")
        
        return {
            "success": True,
            "corrections": corrections,
            "count": len(corrections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW: GET /corrections (for user to fetch their own corrections)
@app.get("/corrections")
async def get_user_corrections(user_email: str, limit: int = 100):
    """
    Get corrections for a specific user (e.g., for user's "sent for training" view)
    """
    try:
        corrections = list(
            corrections_collection.find({"user_email": user_email})
            .sort("created_at", -1)
            .limit(limit)
        )
        
        for correction in corrections:
            correction["_id"] = str(correction["_id"])
            if "created_at" in correction:
                correction["created_at"] = correction["created_at"].isoformat()
            if "updated_at" in correction:
                correction["updated_at"] = correction["updated_at"].isoformat()
            # Enrich with review text
            if "review_id" in correction:
                review = reviews_collection.find_one({"_id": ObjectId(correction["review_id"])})
                if review:
                    correction["review_text"] = review.get("text", "Review text unavailable")
        
        return {
            "success": True,
            "corrections": corrections,
            "count": len(corrections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# OPTIONAL: Enhance /admin/stats to include model stats (if you have them; otherwise keep as-is)
@app.get("/admin/stats")
async def get_admin_stats():
    """
    Get overall admin statistics (enhanced with model info if available)
    """
    try:
        pending_count = corrections_collection.count_documents({"status": "pending_admin_review"})
        approved_count = corrections_collection.count_documents({"status": "approved"})
        rejected_count = corrections_collection.count_documents({"status": "rejected"})
        training_queue_count = training_queue_collection.count_documents({"trained": False})
        
        # Placeholder model stats (replace with real logic if you have a model tracking collection)
        current_accuracy = 94  # Or fetch from elsewhere
        model_version = "v2.4.1"
        accuracy_change = 2.4
        
        return {
            "pending": pending_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "training_queue": training_queue_count,
            "total_corrections": pending_count + approved_count + rejected_count,
            "current_accuracy": current_accuracy,
            "model_version": model_version,
            "accuracy_change": accuracy_change
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Aspect Cloud
@app.get("/top-aspects")
def get_top_aspects(
    user_email: Optional[str] = None,
    limit: int = 10
):
    """
    Get most frequently detected aspects across all reviews for a user
    """
    try:
        query = {}
        if user_email:
            query['user_id'] = user_email
        
        # Only get reviews that have aspects
        query['aspects'] = {'$exists': True, '$ne': []}
        
        # Aggregate all aspects from reviews
        pipeline = [
            {"$match": query},
            {"$unwind": "$aspects"},
            {"$group": {
                "_id": "$aspects.aspect",
                "count": {"$sum": 1},
                "avg_sentiment_score": {
                    "$avg": {
                        "$cond": [
                            {"$eq": ["$aspects.sentiment", "positive"]}, 1,
                            {"$cond": [{"$eq": ["$aspects.sentiment", "negative"]}, -1, 0]}
                        ]
                    }
                }
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        results = list(reviews_collection.aggregate(pipeline))
        
        aspects = [
            {
                "name": result['_id'],
                "count": result['count'],
                "avg_sentiment": result['avg_sentiment_score']
            }
            for result in results
        ]
        
        return {"aspects": aspects, "count": len(aspects)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================
# Active Learning Endpoints - USER SIDE
# ============================================

@app.post("/corrections")
async def save_correction(correction: CorrectionInput):
    """
    Save or update a correction (draft or ready to send to admin)
    """
    try:
        # Check if correction already exists for this review
        existing = corrections_collection.find_one({
            "review_id": correction.review_id,
            "user_email": correction.user_email,
            "status": {"$in": ["draft", "pending_admin_review"]}
        })
        
        correction_doc = {
            "review_id": correction.review_id,
            "user_email": correction.user_email,
            "original_sentiment": correction.original_sentiment,
            "corrected_sentiment": correction.corrected_sentiment,
            "confidence_override": correction.confidence_override,
            "aspects": correction.aspects,
            "status": correction.status,
            "updated_at": datetime.utcnow()
        }
        
        if existing:
            # Update existing correction
            correction_doc["created_at"] = existing["created_at"]
            corrections_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": correction_doc}
            )
            correction_doc["_id"] = str(existing["_id"])
        else:
            # Create new correction
            correction_doc["created_at"] = datetime.utcnow()
            result = corrections_collection.insert_one(correction_doc)
            correction_doc["_id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "message": "Correction saved successfully",
            "correction_id": correction_doc["_id"],
            "status": correction.status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/corrections")
async def get_user_corrections(user_email: str, status: Optional[str] = None):
    """
    Get all corrections for a user, optionally filtered by status
    """
    try:
        query = {"user_email": user_email}
        if status:
            query["status"] = status
        
        corrections = list(corrections_collection.find(query).sort("updated_at", -1))
        
        for correction in corrections:
            correction["_id"] = str(correction["_id"])
            correction["created_at"] = correction["created_at"].isoformat()
            correction["updated_at"] = correction["updated_at"].isoformat()
        
        return {
            "success": True,
            "corrections": corrections,
            "count": len(corrections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/corrections/{correction_id}/send-to-admin")
async def send_to_admin(correction_id: str):
    """
    Update correction status to pending_admin_review
    """
    try:
        result = corrections_collection.update_one(
            {"_id": ObjectId(correction_id)},
            {
                "$set": {
                    "status": "pending_admin_review",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Correction not found")
        
        return {
            "success": True,
            "message": "Correction sent to admin for review"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-training-stats")
async def get_user_training_stats(user_email: str):
    """
    Get user's contribution statistics
    """
    try:
        # Count by status
        pipeline = [
            {"$match": {"user_email": user_email}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        results = list(corrections_collection.aggregate(pipeline))
        
        stats = {
            "sentToAdmin": 0,
            "inProgress": 0,
            "completed": 0,
            "drafts": 0
        }
        
        for result in results:
            status = result["_id"]
            count = result["count"]
            
            if status == "pending_admin_review":
                stats["sentToAdmin"] = count
                stats["inProgress"] = count
            elif status == "approved":
                stats["completed"] = count
            elif status == "draft":
                stats["drafts"] = count
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training-queue")
async def get_user_sent_reviews(user_email: str):
    """
    Get reviews that user has sent to admin (pending or approved)
    """
    try:
        corrections = list(corrections_collection.find({
            "user_email": user_email,
            "status": {"$in": ["pending_admin_review", "approved", "rejected"]}
        }).sort("updated_at", -1))
        
        # Fetch review texts
        for correction in corrections:
            correction["_id"] = str(correction["_id"])
            correction["created_at"] = correction["created_at"].isoformat()
            correction["updated_at"] = correction["updated_at"].isoformat()
            
            # Get original review text
            review = reviews_collection.find_one({"_id": ObjectId(correction["review_id"])})
            if review:
                correction["review_text"] = review["text"]
            
            if "reviewed_at" in correction:
                correction["reviewed_at"] = correction["reviewed_at"].isoformat()
        
        return {
            "success": True,
            "reviews": corrections,
            "count": len(corrections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Active Learning Endpoints - ADMIN SIDE
# ============================================

@app.get("/admin/pending-corrections")
async def get_pending_corrections(limit: int = 100):
    """
    Get all corrections pending admin review
    """
    try:
        corrections = list(corrections_collection.find({
            "status": "pending_admin_review"
        }).sort("updated_at", -1).limit(limit))
        
        # Enrich with review text and user info
        for correction in corrections:
            correction["_id"] = str(correction["_id"])
            correction["created_at"] = correction["created_at"].isoformat()
            correction["updated_at"] = correction["updated_at"].isoformat()
            
            # Get original review
            review = reviews_collection.find_one({"_id": ObjectId(correction["review_id"])})
            if review:
                correction["review_text"] = review["text"]
                correction["original_confidence"] = review.get("confidence", 0)
                correction["original_aspects"] = review.get("aspects", [])
        
        return {
            "success": True,
            "corrections": corrections,
            "count": len(corrections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/corrections/{correction_id}/approve")
async def approve_correction(correction_id: str, admin_review: AdminReviewInput):
    """
    Approve a correction and add to training queue
    """
    try:
        # Get the correction
        correction = corrections_collection.find_one({"_id": ObjectId(correction_id)})
        if not correction:
            raise HTTPException(status_code=404, detail="Correction not found")
        
        # Get original review
        review = reviews_collection.find_one({"_id": ObjectId(correction["review_id"])})
        if not review:
            raise HTTPException(status_code=404, detail="Original review not found")
        
        # Update correction status
        corrections_collection.update_one(
            {"_id": ObjectId(correction_id)},
            {
                "$set": {
                    "status": "approved",
                    "reviewed_by": admin_review.admin_email,
                    "reviewed_at": datetime.utcnow(),
                    "admin_notes": admin_review.notes
                }
            }
        )
        
        # Add to training queue
        training_item = {
            "review_id": correction["review_id"],
            "correction_id": correction_id,
            "review_text": review["text"],
            "original_sentiment": correction["original_sentiment"],
            "sentiment": correction["corrected_sentiment"],
            "confidence": correction["confidence_override"],
            "aspects": correction["aspects"],
            "user_email": correction["user_email"],
            "approved_by": admin_review.admin_email,
            "approved_at": datetime.utcnow(),
            "trained": False
        }
        
        training_queue_collection.insert_one(training_item)
        
        return {
            "success": True,
            "message": "Correction approved and added to training queue"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/corrections/{correction_id}/reject")
async def reject_correction(correction_id: str, admin_review: AdminReviewInput):
    """
    Reject a correction
    """
    try:
        result = corrections_collection.update_one(
            {"_id": ObjectId(correction_id)},
            {
                "$set": {
                    "status": "rejected",
                    "reviewed_by": admin_review.admin_email,
                    "reviewed_at": datetime.utcnow(),
                    "admin_notes": admin_review.notes
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Correction not found")
        
        return {
            "success": True,
            "message": "Correction rejected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/training-queue")
async def get_training_queue(limit: int = 100):
    """
    Get all approved items in training queue
    """
    try:
        queue = list(training_queue_collection.find({
            "trained": False
        }).sort("approved_at", -1).limit(limit))
        
        for item in queue:
            item["_id"] = str(item["_id"])
            item["approved_at"] = item["approved_at"].isoformat()
        
        return {
            "success": True,
            "queue": queue,
            "count": len(queue)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/training-queue/{item_id}")
async def remove_from_training_queue(item_id: str):
    """
    Remove item from training queue (revert to pending)
    """
    try:
        # Get the training item
        item = training_queue_collection.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Training item not found")
        
        # Delete from training queue
        training_queue_collection.delete_one({"_id": ObjectId(item_id)})
        
        # Revert correction status to pending
        corrections_collection.update_one(
            {"_id": ObjectId(item["correction_id"])},
            {
                "$set": {
                    "status": "pending_admin_review",
                    "updated_at": datetime.utcnow()
                },
                "$unset": {
                    "reviewed_by": "",
                    "reviewed_at": "",
                    "admin_notes": ""
                }
            }
        )
        
        return {
            "success": True,
            "message": "Item removed from training queue and reverted to pending"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/stats")
async def get_admin_stats():
    """
    Get overall admin statistics
    """
    try:
        pending_count = corrections_collection.count_documents({"status": "pending_admin_review"})
        approved_count = corrections_collection.count_documents({"status": "approved"})
        rejected_count = corrections_collection.count_documents({"status": "rejected"})
        training_queue_count = training_queue_collection.count_documents({"trained": False})
        
        return {
            "pending": pending_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "training_queue": training_queue_count,
            "total_corrections": pending_count + approved_count + rejected_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Run with: uvicorn sentiment_api:app --reload
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)