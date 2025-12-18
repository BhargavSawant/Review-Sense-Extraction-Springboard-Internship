# backend\sentiment_api.py

from fastapi import FastAPI, Request, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline
from typing import List, Optional, Dict
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv
import pandas as pd
import io
from fastapi import UploadFile, File
import base64
from collections import Counter
from typing import List
from enum import Enum
import psutil
import time
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Sentiment Analysis API")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001","http://localhost:3000"],  # Your Next.js URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def track_api_traffic(request: Request, call_next):
    """
    Middleware to track all API requests for traffic analytics
    """
    start_time = time.time()
    
    # Process the request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Record the request (async to not slow down response)
    try:
        # Get the hour timestamp
        current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        
        # Increment counter for this hour
        api_traffic_collection.update_one(
            {
                "timestamp": current_hour,
                "endpoint": request.url.path
            },
            {
                "$inc": {"count": 1},
                "$set": {"last_updated": datetime.utcnow()},
                "$push": {
                    "response_times": {
                        "$each": [round(process_time * 1000, 2)],  # milliseconds
                        "$slice": -100  # Keep last 100 response times
                    }
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Traffic tracking error: {e}")

    return response

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "YOUR MONGODB URL")
client = MongoClient(MONGODB_URI)
db = client["sentiment_db"]
reviews_collection = db["reviews"]
corrections_collection = db["corrections"]
training_queue_collection = db["training_queue"]
users_collection = db["user-management"]
api_traffic_collection = db["api_traffic"]
feedback_collection = db["user_feedback"]

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

class UserStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    terminated = "terminated"

class UserRole(str, Enum):
    user = "user"
    admin = "admin"

class UserUpdateInput(BaseModel):
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None
    suspension_reason: Optional[str] = None
    notes: Optional[str] = None

class UserStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    terminated_users: int
    new_users_this_month: int
    admin_users: int

class FeedbackInput(BaseModel):
    user_email: str
    ratings: Dict[str, int] = Field(..., description="Ratings for each aspect (1-5)")
    detailed_feedback: Optional[str] = None
    timestamp: Optional[datetime] = None

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[str] = None

class UpdateFeedback(BaseModel):
    status: str
    admin_response: Optional[str] = None

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
# END: predict_sentiment - Handles single text sentiment prediction with label mapping

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
# END: predict_batch - Batch sentiment prediction for multiple texts

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
# END: root - API welcome endpoint with feature and endpoint listing

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
# END: predict_single - Single review sentiment prediction endpoint

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
# END: predict_multiple - Batch sentiment prediction endpoint

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
# END: save_review_with_sentiment - Analyze and save review to database

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
# END: analyze_single_with_aspects - Single review analysis with aspect extraction

# Replace the upload_reviews_file function in sentiment_api.py (around line 487)

@app.post("/upload-reviews")
async def upload_reviews_file(
    file: UploadFile = File(...),
    product_name: str = Form(...),
    user_id: str = Form(...),
    save_to_db: bool = Form(True)
):
    """
    Upload CSV/Excel file with reviews and return bulk analysis with individual review details
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
        MAX_DISPLAY_REVIEWS = 50  # Only return detailed analysis for first 50
        truncated = False
        if len(reviews) > MAX_REVIEWS:
            reviews = reviews[:MAX_REVIEWS]
            truncated = True
        
        # Analyze all reviews with Simplified KeyBERT ABSA
        print(f"\n{'='*60}")
        print(f" BULK ANALYSIS STARTED (KeyBERT)")
        print(f"{'='*60}")
        
        # Get aggregated results
        aggregated = hybrid_analyzer.analyze_bulk_reviews(reviews, product_name, top_n=20)
        
        # Get individual results for display (first 50 reviews)
        individual_results = []
        for i, review_text in enumerate(reviews[:MAX_DISPLAY_REVIEWS]):
            if len(review_text.strip()) > 0:
                try:
                    result = hybrid_analyzer.analyze_single_review(review_text, top_n=5)
                    individual_results.append({
                        "text": review_text,
                        "overall_sentiment": result['overall_sentiment'],
                        "overall_confidence": result['overall_confidence'],
                        "aspects": result['aspects'][:5],  # Top 5 aspects per review
                        "total_aspects_found": result['total_aspects_found']
                    })
                except Exception as e:
                    print(f"Error analyzing review {i+1}: {str(e)}")
                    # Add a fallback entry
                    individual_results.append({
                        "text": review_text,
                        "overall_sentiment": "neutral",
                        "overall_confidence": 0.5,
                        "aspects": [],
                        "total_aspects_found": 0,
                        "error": str(e)
                    })
        
        # Save to MongoDB if requested
        summary_id = None
        if save_to_db:
            try:
                summary_doc = {
                    "user_id": user_id,
                    "product_name": product_name,
                    "analysis_type": "bulk",
                    "extraction_method": "keybert_absa",
                    "total_reviews": len(reviews),
                    "file_name": file.filename,
                    "aggregated_results": aggregated,
                    "timestamp": datetime.utcnow(),
                    "truncated": truncated
                }
                summary_result = reviews_collection.insert_one(summary_doc)
                summary_id = str(summary_result.inserted_id)
                print(f"Saved bulk summary with ID: {summary_id}")
            except Exception as db_error:
                print(f"Database save error for summary: {str(db_error)}")
        
        # NEW: Save individual reviews (all, not just first 50)
        if save_to_db and summary_id:
            bulk_review_docs = []
            for i, review_text in enumerate(reviews):  # All reviews
                if len(review_text.strip()) > 0:
                    try:
                        result = hybrid_analyzer.analyze_single_review(review_text, top_n=5)
                        doc = {
                            "text": review_text,
                            "sentiment": result['overall_sentiment'],
                            "confidence": result['overall_confidence'],
                            "aspects": result['aspects'],
                            "total_aspects_found": result['total_aspects_found'],
                            "product_id": product_name,  # Use product_name as ID
                            "user_id": user_id,
                            "analysis_type": "bulk",
                            "bulk_summary_id": summary_id,  # Link back to summary
                            "extraction_method": "keybert_absa",
                            "timestamp": datetime.utcnow()
                        }
                        bulk_review_docs.append(doc)
                    except Exception as e:
                        print(f"Error saving review {i+1}: {str(e)}")
                        # Skip or save with fallback (here we skip for simplicity)
                        pass  # Or add fallback doc if needed
            
            if bulk_review_docs:
                reviews_collection.insert_many(bulk_review_docs)
                print(f"Saved {len(bulk_review_docs)} individual bulk reviews")
        
        print(f"{'='*60}")
        print(f"BULK ANALYSIS COMPLETED")
        print(f"{'='*60}\n")
        
        # Prepare response with enhanced data structure
        response_data = {
            "success": True,
            "message": f"Analyzed {len(reviews)} reviews successfully with Simplified KeyBERT ABSA",
            "truncated": truncated,
            "results": {
                **aggregated,  # Include all aggregated results
                "individual_results": individual_results,  # Add individual results
                "total_analyzed": len(reviews),
                "displayed_count": len(individual_results)
            }
        }
        
        return response_data
        
    except Exception as e:
        print(f"\nError: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Error processing file: {str(e)}"
        }
# END: upload_reviews_file - Bulk review analysis with Simplified KeyBERT ABSA

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
# END: get_reviews - Fetch reviews with optional filtering

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
# END: get_sentiment_stats - Get aggregated sentiment statistics

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
# END: delete_review - Delete a specific review by ID

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
# END: get_user_reviews - Fetch all reviews for a specific user

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
# END: create_correction - Create new correction for active learning

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
# END: get_admin_corrections - Admin endpoint to fetch corrections by status

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
# END: get_user_corrections - Fetch corrections for a specific user

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
# END: get_admin_stats - Get comprehensive admin statistics with model metrics

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
# END: get_top_aspects - Get most frequently detected aspects with sentiment scores

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
# END: save_correction - Save or update user correction (draft or submit)

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
# END: get_user_corrections - Get user's corrections with optional status filter

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
# END: send_to_admin - Submit correction for admin review

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
# END: get_user_training_stats - Get user's training contribution statistics

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
# END: get_user_sent_reviews - Get user's submitted corrections with review details

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
# END: get_pending_corrections - Get all corrections awaiting admin review

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
# END: approve_correction - Approve correction and add to training queue

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
# END: reject_correction - Reject a user correction with admin notes

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
# END: get_training_queue - Get all approved corrections ready for model training

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
# END: remove_from_training_queue - Remove item from training and revert status

@app.get("/admin/users")
async def get_all_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Get all users with optional filters
    """
    try:
        query = {}
        
        if status:
            query["status"] = status
        if role:
            query["role"] = role
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}}
            ]
        
        # FIXED: Use correct collection name
        users = list(
            users_collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        
        # Enrich with activity data
        for user in users:
            user["_id"] = str(user["_id"])
            if "created_at" in user:
                user["created_at"] = user["created_at"].isoformat()
            if "last_login" in user and user["last_login"]:
                user["last_login"] = user["last_login"].isoformat()
            
            # Get user's review count
            user["review_count"] = reviews_collection.count_documents(
                {"user_id": user["email"]}
            )
            
            # Get user's correction count
            user["correction_count"] = corrections_collection.count_documents(
                {"user_email": user["email"]}
            )
        
        total_count = users_collection.count_documents(query)
        
        return {
            "success": True,
            "users": users,
            "count": len(users),
            "total": total_count
        }
    except Exception as e:
        print(f"Error in get_all_users: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: get_all_users - Get all users with filters and activity enrichment

@app.get("/admin/users/stats")
async def get_user_statistics():
    """
    Get overall user statistics
    """
    try:
        total_users = users_collection.count_documents({})
        active_users = users_collection.count_documents({"status": "active"})
        suspended_users = users_collection.count_documents({"status": "suspended"})
        terminated_users = users_collection.count_documents({"status": "terminated"})
        admin_users = users_collection.count_documents({"role": "admin"})
        
        # New users this month
        from datetime import datetime, timedelta
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_users_this_month = users_collection.count_documents({
            "created_at": {"$gte": first_day_of_month}
        })
        
        return UserStatsResponse(
            total_users=total_users,
            active_users=active_users,
            suspended_users=suspended_users,
            terminated_users=terminated_users,
            new_users_this_month=new_users_this_month,
            admin_users=admin_users
        )
    except Exception as e:
        print(f"Error in get_user_statistics: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: get_user_statistics - Get comprehensive user statistics

@app.get("/admin/users/{user_email}")
async def get_user_details(user_email: str):
    """
    Get detailed information about a specific user
    """
    try:
        user = users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user["_id"] = str(user["_id"])
        if "created_at" in user:
            user["created_at"] = user["created_at"].isoformat()
        if "last_login" in user and user["last_login"]:
            user["last_login"] = user["last_login"].isoformat()
        
        # Get user activity
        user["reviews"] = reviews_collection.count_documents({"user_id": user_email})
        user["corrections"] = corrections_collection.count_documents({"user_email": user_email})
        
        # Get recent activity
        recent_reviews = list(
            reviews_collection.find({"user_id": user_email})
            .sort("timestamp", -1)
            .limit(5)
        )
        
        for review in recent_reviews:
            review["_id"] = str(review["_id"])
            review["timestamp"] = review["timestamp"].isoformat()
        
        user["recent_reviews"] = recent_reviews
        
        return {
            "success": True,
            "user": user
        }
    except Exception as e:
        print(f"Error in get_user_details: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: get_user_details - Get detailed user information with activity history

@app.patch("/admin/users/{user_email}")
async def update_user(user_email: str, update: UserUpdateInput):
    """
    Update user status, role, or other properties
    """
    try:
        user = users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_doc = {"updated_at": datetime.utcnow()}
        
        if update.status:
            update_doc["status"] = update.status
            if update.status == "suspended" and update.suspension_reason:
                update_doc["suspension_reason"] = update.suspension_reason
                update_doc["suspended_at"] = datetime.utcnow()
        
        if update.role:
            update_doc["role"] = update.role
        
        if update.notes:
            update_doc["admin_notes"] = update.notes
        
        users_collection.update_one(
            {"email": user_email},
            {"$set": update_doc}
        )
        
        return {
            "success": True,
            "message": "User updated successfully"
        }
    except Exception as e:
        print(f"Error in update_user: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: update_user - Update user status, role, or other properties

@app.delete("/admin/users/{user_email}")
async def delete_user(user_email: str):
    """
    Permanently delete a user and all their data
    """
    try:
        user = users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user's reviews
        reviews_collection.delete_many({"user_id": user_email})
        
        # Delete user's corrections
        corrections_collection.delete_many({"user_email": user_email})
        
        # Delete user
        users_collection.delete_one({"email": user_email})
        
        return {
            "success": True,
            "message": "User and all associated data deleted successfully"
        }
    except Exception as e:
        print(f"Error in delete_user: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: delete_user - Permanently delete user and all associated data

@app.post("/admin/users/{user_email}/send-email")
async def send_user_email(user_email: str, subject: str = Form(...), message: str = Form(...)):
    """
    Send email notification to user (placeholder - implement with your email service)
    """
    try:
        user = users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # TODO: Implement actual email sending logic here
        # For now, just log it
        print(f"Email to {user_email}: {subject} - {message}")
        
        return {
            "success": True,
            "message": "Email sent successfully"
        }
    except Exception as e:
        print(f"Error in send_user_email: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
# END: send_user_email - Send email notification to user (placeholder)

@app.get("/admin/system-health")
async def get_system_health():
    """
    Get comprehensive system health metrics
    """
    try:
        # API Latency (ping test)
        api_start = time.time()
        # Simulate API work
        _ = reviews_collection.count_documents({})
        api_latency = int((time.time() - api_start) * 1000)
        
        # Database Latency
        db_start = time.time()
        db.command('ping')
        db_latency = int((time.time() - db_start) * 1000)
        
        # Calculate uptime (placeholder - implement actual uptime tracking)
        uptime_percentage = 99.98
        
        # Overall status
        overall_status = "healthy"
        if api_latency > 200 or db_latency > 100:
            overall_status = "degraded"
        
        return {
            "success": True,
            "overall_status": overall_status,
            "api_latency": api_latency,
            "database_latency": db_latency,
            "uptime_percentage": uptime_percentage,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/infrastructure-metrics")
async def get_infrastructure_metrics():
    """
    Get server infrastructure metrics (CPU, Memory, Disk, Network)
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        return {
            "success": True,
            "cpu_usage": round(cpu_percent, 1),
            "memory_usage": round(memory.percent, 1),
            "disk_usage": round(disk.percent, 1),
            "network_throughput": round(network.bytes_sent / 1024 / 1024, 2),  # MB/s
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/services-status")
async def get_services_status():
    """
    Get status of all microservices
    """
    try:
        services = []
        
        # API Gateway
        api_latency = 45  # Measure actual latency
        services.append({
            "name": "API Gateway",
            "status": "operational",
            "latency": api_latency,
            "requests_per_min": reviews_collection.count_documents({"timestamp": {"$gte": datetime.utcnow() - timedelta(minutes=1)}}) * 60,
            "icon": "network"
        })
        
        # ML Engine
        services.append({
            "name": "ML Engine",
            "status": "operational",
            "latency": 89,
            "requests_per_min": 847,
            "icon": "brain"
        })
        
        # Training Queue
        queue_count = training_queue_collection.count_documents({"trained": False})
        services.append({
            "name": "Training Queue",
            "status": "warning" if queue_count > 50 else "operational",
            "latency": 156,
            "requests_per_min": queue_count,
            "icon": "layers"
        })
        
        # Cache Layer (placeholder)
        services.append({
            "name": "Cache Layer",
            "status": "operational",
            "latency": 8,
            "requests_per_min": 3421,
            "icon": "zap"
        })
        
        return {
            "success": True,
            "services": services
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/ml-engine-status")
async def get_ml_engine_status():
    """
    Get ML model performance metrics
    """
    try:
        # Get recent predictions count
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        predictions_today = reviews_collection.count_documents({
            "timestamp": {"$gte": today_start}
        })
        
        # Get average confidence (as proxy for performance)
        pipeline = [
            {"$match": {"timestamp": {"$gte": today_start}}},
            {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence"}}}
        ]
        result = list(reviews_collection.aggregate(pipeline))
        avg_confidence = result[0]["avg_confidence"] if result else 0.94
        
        return {
            "success": True,
            "model_version": "v2.4.1",
            "accuracy": round(avg_confidence * 100, 1),
            "drift_detected": False,
            "predictions_today": predictions_today,
            "avg_inference_time": 89,  # Track this in production
            "last_training": "2024-12-09T14:30:00Z"  # Implement actual tracking
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/database-status")
async def get_database_status():
    """
    Get MongoDB cluster health metrics
    """
    try:
        # Get database stats
        db_stats = db.command("dbStats")
        server_status = db.command("serverStatus")
        
        storage_used = (db_stats.get("dataSize", 0) / db_stats.get("storageSize", 1)) * 100
        
        return {
            "success": True,
            "cluster_status": "healthy",
            "active_connections": server_status.get("connections", {}).get("current", 47),
            "storage_used": round(storage_used, 1),
            "queries_per_sec": 342,  # Track from server_status
            "replication_lag": 0.8,
            "last_backup": "2024-12-11T02:00:00Z"  # Implement backup tracking
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/system-logs")
async def get_system_logs(limit: int = 50):
    """
    Get recent system logs
    """
    try:
        # In production, fetch from a logging system
        # For now, return simulated recent events
        logs = [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "level": "info",
                "message": "ML model v2.4.1 inference completed successfully"
            },
            {
                "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                "level": "info",
                "message": "Database backup completed"
            },
            {
                "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat(),
                "level": "warning",
                "message": f"Training queue backlog detected: {training_queue_collection.count_documents({'trained': False})} items"
            }
        ]
        
        return {
            "success": True,
            "logs": logs[:limit],
            "count": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
#END: get_system_logs - Get recent system logs (simulated)

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
    
# END: get_admin_stats - Get overall admin statistics for dashboard

@app.get("/admin/api-traffic")
async def get_api_traffic(hours: int = 24):
    """
    Get real API traffic data for the last N hours
    """
    try:
        # Calculate time range
        end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        start_time = end_time - timedelta(hours=hours)
        
        # Aggregate traffic by hour
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$group": {
                    "_id": "$timestamp",
                    "total_requests": {"$sum": "$count"},
                    "unique_endpoints": {"$addToSet": "$endpoint"},
                    "avg_response_time": {
                        "$avg": {
                            "$avg": "$response_times"
                        }
                    }
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        results = list(api_traffic_collection.aggregate(pipeline))
        
        # Format the data
        traffic_data = []
        current_time = start_time
        
        # Create a map of existing data
        data_map = {result["_id"]: result for result in results}
        
        # Fill in all hours (including zeros for hours with no traffic)
        while current_time <= end_time:
            if current_time in data_map:
                data = data_map[current_time]
                traffic_data.append({
                    "time": current_time.strftime("%H:%M"),
                    "full_timestamp": current_time.isoformat(),
                    "requests": data["total_requests"],
                    "unique_endpoints": len(data["unique_endpoints"]),
                    "avg_response_time": round(data.get("avg_response_time", 0), 2)
                })
            else:
                # No traffic for this hour
                traffic_data.append({
                    "time": current_time.strftime("%H:%M"),
                    "full_timestamp": current_time.isoformat(),
                    "requests": 0,
                    "unique_endpoints": 0,
                    "avg_response_time": 0
                })
            
            current_time += timedelta(hours=1)
        
        # Get total stats
        total_requests = sum(item["requests"] for item in traffic_data)
        peak_hour = max(traffic_data, key=lambda x: x["requests"]) if traffic_data else None
        
        return {
            "success": True,
            "traffic_data": traffic_data,
            "total_requests": total_requests,
            "peak_hour": peak_hour,
            "hours_tracked": hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/api-traffic/endpoints")
async def get_endpoint_traffic(limit: int = 10):
    """
    Get traffic breakdown by endpoint
    """
    try:
        # Get traffic for last 24 hours
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": yesterday}
                }
            },
            {
                "$group": {
                    "_id": "$endpoint",
                    "total_requests": {"$sum": "$count"},
                    "avg_response_time": {
                        "$avg": {"$avg": "$response_times"}
                    }
                }
            },
            {
                "$sort": {"total_requests": -1}
            },
            {
                "$limit": limit
            }
        ]
        
        results = list(api_traffic_collection.aggregate(pipeline))
        
        endpoints = [
            {
                "endpoint": result["_id"],
                "requests": result["total_requests"],
                "avg_response_time": round(result.get("avg_response_time", 0), 2)
            }
            for result in results
        ]
        
        return {
            "success": True,
            "endpoints": endpoints,
            "count": len(endpoints)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_endpoint_traffic - Get API traffic breakdown by endpoint

@app.get("/sentiment-trend")
async def get_sentiment_trend(
    user_email: Optional[str] = None,
    days: int = 7
):
    """
    Get sentiment trend data for the last N days
    """
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
        if user_email:
            query["user_id"] = user_email
        
        # Aggregate by day and sentiment
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$timestamp"
                            }
                        },
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.date": 1}}
        ]
        
        results = list(reviews_collection.aggregate(pipeline))
        
        # Format data for frontend
        dates = []
        positive_data = []
        neutral_data = []
        negative_data = []
        
        # Create a map of all dates in range
        current_date = start_date
        date_map = {}
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            date_map[date_str] = {"positive": 0, "neutral": 0, "negative": 0}
            current_date += timedelta(days=1)
        
        # Fill in actual data
        for result in results:
            date_str = result["_id"]["date"]
            sentiment = result["_id"]["sentiment"]
            count = result["count"]
            
            if date_str in date_map:
                date_map[date_str][sentiment] = count
        
        # Convert to arrays
        for date_str in sorted(date_map.keys()):
            # Format date as weekday abbreviation
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            dates.append(date_obj.strftime("%a"))
            positive_data.append(date_map[date_str]["positive"])
            neutral_data.append(date_map[date_str]["neutral"])
            negative_data.append(date_map[date_str]["negative"])
        
        return {
            "success": True,
            "days": dates,
            "positive": positive_data,
            "neutral": neutral_data,
            "negative": negative_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emotion-distribution")
async def get_emotion_distribution(user_email: Optional[str] = None):
    """
    Get emotion distribution based on aspects and sentiments
    """
    try:
        query = {"aspects": {"$exists": True, "$ne": []}}
        if user_email:
            query["user_id"] = user_email
        
        # Get all reviews with aspects
        reviews = list(reviews_collection.find(query))
        
        # Define emotion mapping based on aspects and sentiments
        emotion_keywords = {
            "joy": ["quality", "excellent", "great", "amazing", "love", "perfect"],
            "trust": ["reliable", "consistent", "secure", "safe", "authentic"],
            "anger": ["poor", "bad", "terrible", "worst", "awful", "horrible"],
            "anticipation": ["expect", "hope", "wait", "coming", "future", "next"],
            "sadness": ["disappointed", "sad", "unfortunate", "regret", "miss"]
        }
        
        emotion_counts = {
            "joy": 0,
            "trust": 0,
            "anger": 0,
            "anticipation": 0,
            "sadness": 0
        }
        
        # Analyze reviews for emotions
        for review in reviews:
            text_lower = review.get("text", "").lower()
            sentiment = review.get("sentiment", "neutral")
            
            # Joy - positive sentiment + positive aspects
            if sentiment == "positive":
                emotion_counts["joy"] += 5
                for keyword in emotion_keywords["joy"]:
                    if keyword in text_lower:
                        emotion_counts["joy"] += 2
            
            # Trust - consistent positive mentions
            if sentiment == "positive" and len(review.get("aspects", [])) > 2:
                emotion_counts["trust"] += 3
            
            # Anger - negative sentiment
            if sentiment == "negative":
                emotion_counts["anger"] += 4
                for keyword in emotion_keywords["anger"]:
                    if keyword in text_lower:
                        emotion_counts["anger"] += 2
            
            # Anticipation - neutral with future-looking aspects
            for keyword in emotion_keywords["anticipation"]:
                if keyword in text_lower:
                    emotion_counts["anticipation"] += 2
            
            # Sadness - negative with disappointment
            if sentiment == "negative":
                for keyword in emotion_keywords["sadness"]:
                    if keyword in text_lower:
                        emotion_counts["sadness"] += 3
        
        # Convert to list format for frontend
        emotions = [
            {"name": "Joy", "value": emotion_counts["joy"], "color": "#4CD4A5"},
            {"name": "Trust", "value": emotion_counts["trust"], "color": "#4A7DFF"},
            {"name": "Anger", "value": emotion_counts["anger"], "color": "#E95252"},
            {"name": "Anticipation", "value": emotion_counts["anticipation"], "color": "#FF7661"},
            {"name": "Sadness", "value": emotion_counts["sadness"], "color": "#9CA3AF"}
        ]
        
        return {
            "success": True,
            "emotions": emotions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_emotion_distribution - Get emotion distribution based on aspects and sentiments

@app.get("/admin/user-activity")
async def get_user_activity(hours: int = 24):
    """
    Get user activity data (reviews and corrections) for the last N hours
    Track active users, reviews submitted, and corrections made
    """
    try:
        # Calculate time range
        end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        start_time = end_time - timedelta(hours=hours)
        
        # Initialize data structure for all hours
        activity_data = []
        current_time = start_time
        
        while current_time <= end_time:
            activity_data.append({
                "time": current_time.strftime("%H:%M"),
                "full_timestamp": current_time.isoformat(),
                "reviews": 0,
                "corrections": 0,
                "active_users": 0,
                "total_activity": 0
            })
            current_time += timedelta(hours=1)
        
        # Get reviews data
        reviews_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%dT%H:00:00",
                            "date": "$timestamp"
                        }
                    },
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_id"}
                }
            }
        ]
        
        reviews_results = list(reviews_collection.aggregate(reviews_pipeline))
        
        # Get corrections data
        corrections_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%dT%H:00:00",
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_email"}
                }
            }
        ]
        
        corrections_results = list(corrections_collection.aggregate(corrections_pipeline))
        
        # Create lookup maps
        reviews_map = {result["_id"]: result for result in reviews_results}
        corrections_map = {result["_id"]: result for result in corrections_results}
        
        # Fill in the data
        total_reviews = 0
        total_corrections = 0
        peak_activity = 0
        peak_hour = None
        
        for item in activity_data:
            timestamp_key = item["full_timestamp"]
            
            # Add reviews data
            if timestamp_key in reviews_map:
                reviews_data = reviews_map[timestamp_key]
                item["reviews"] = reviews_data["count"]
                total_reviews += reviews_data["count"]
            
            # Add corrections data
            if timestamp_key in corrections_map:
                corrections_data = corrections_map[timestamp_key]
                item["corrections"] = corrections_data["count"]
                total_corrections += corrections_data["count"]
            
            # Calculate unique active users for this hour
            unique_users = set()
            if timestamp_key in reviews_map:
                unique_users.update(reviews_map[timestamp_key]["unique_users"])
            if timestamp_key in corrections_map:
                unique_users.update(corrections_map[timestamp_key]["unique_users"])
            
            # Remove None values
            unique_users.discard(None)
            item["active_users"] = len(unique_users)
            
            # Calculate total activity
            item["total_activity"] = item["reviews"] + item["corrections"]
            
            # Track peak hour
            if item["total_activity"] > peak_activity:
                peak_activity = item["total_activity"]
                peak_hour = {
                    "time": item["time"],
                    "activity": item["total_activity"]
                }
        
        return {
            "success": True,
            "activity_data": activity_data,
            "total_reviews": total_reviews,
            "total_corrections": total_corrections,
            "peak_hour": peak_hour,
            "hours_tracked": hours
        }
    except Exception as e:
        print(f"Error in get_user_activity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/activity-summary")
async def get_activity_summary(days: int = 7):
    """
    Get activity summary for the last N days
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get reviews count
        reviews_count = reviews_collection.count_documents({
            "timestamp": {"$gte": start_date, "$lte": end_date}
        })
        
        # Get corrections count
        corrections_count = corrections_collection.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Get unique active users
        reviews_users = reviews_collection.distinct("user_id", {
            "timestamp": {"$gte": start_date, "$lte": end_date}
        })
        corrections_users = corrections_collection.distinct("user_email", {
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        unique_users = set(reviews_users + corrections_users)
        unique_users.discard(None)
        
        return {
            "success": True,
            "total_reviews": reviews_count,
            "total_corrections": corrections_count,
            "active_users": len(unique_users),
            "days": days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/hourly-activity")
async def get_hourly_activity():
    """
    Get activity distribution by hour of day (0-23)
    """
    try:
        # Get last 7 days of data
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": seven_days_ago}
                }
            },
            {
                "$group": {
                    "_id": {"$hour": "$timestamp"},
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        results = list(reviews_collection.aggregate(pipeline))
        
        # Format data
        hourly_data = []
        for hour in range(24):
            count = 0
            for result in results:
                if result["_id"] == hour:
                    count = result["count"]
                    break
            
            hourly_data.append({
                "hour": f"{hour:02d}:00",
                "activity": count
            })
        
        # Find peak hour
        peak = max(hourly_data, key=lambda x: x["activity"])
        
        return {
            "success": True,
            "hourly_data": hourly_data,
            "peak_hour": peak["hour"],
            "peak_activity": peak["activity"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/daily-activity")
async def get_daily_activity(days: int = 30):
    """
    Get daily activity for the last N days
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Reviews by day
        reviews_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        reviews_results = list(reviews_collection.aggregate(reviews_pipeline))
        
        # Corrections by day
        corrections_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        corrections_results = list(corrections_collection.aggregate(corrections_pipeline))
        
        # Create maps
        reviews_map = {r["_id"]: r["count"] for r in reviews_results}
        corrections_map = {c["_id"]: c["count"] for c in corrections_results}
        
        # Generate daily data
        daily_data = []
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            daily_data.append({
                "date": date_str,
                "day": current_date.strftime("%a"),
                "reviews": reviews_map.get(date_str, 0),
                "corrections": corrections_map.get(date_str, 0),
                "total": reviews_map.get(date_str, 0) + corrections_map.get(date_str, 0)
            })
            current_date += timedelta(days=1)
        
        return {
            "success": True,
            "daily_data": daily_data,
            "days": days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/user-engagement")
async def get_user_engagement():
    """
    Get user engagement metrics
    """
    try:
        # Active users (users with activity in last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        active_review_users = reviews_collection.distinct("user_id", {
            "timestamp": {"$gte": seven_days_ago}
        })
        active_correction_users = corrections_collection.distinct("user_email", {
            "created_at": {"$gte": seven_days_ago}
        })
        
        active_users = set(active_review_users + active_correction_users)
        active_users.discard(None)
        
        # Top contributors
        top_reviewers_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": seven_days_ago}
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "review_count": {"$sum": 1}
                }
            },
            {
                "$sort": {"review_count": -1}
            },
            {
                "$limit": 5
            }
        ]
        
        top_reviewers = list(reviews_collection.aggregate(top_reviewers_pipeline))
        
        top_correctors_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": seven_days_ago}
                }
            },
            {
                "$group": {
                    "_id": "$user_email",
                    "correction_count": {"$sum": 1}
                }
            },
            {
                "$sort": {"correction_count": -1}
            },
            {
                "$limit": 5
            }
        ]
        
        top_correctors = list(corrections_collection.aggregate(top_correctors_pipeline))
        
        return {
            "success": True,
            "active_users_7d": len(active_users),
            "top_reviewers": [
                {
                    "user": r["_id"],
                    "count": r["review_count"]
                }
                for r in top_reviewers if r["_id"]
            ],
            "top_correctors": [
                {
                    "user": c["_id"],
                    "count": c["correction_count"]
                }
                for c in top_correctors if c["_id"]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/performance-metrics")
async def get_performance_metrics():
    """
    Get system performance metrics
    """
    try:
        # Calculate average response times from recent API traffic
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": one_hour_ago}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_response_time": {
                        "$avg": {"$avg": "$response_times"}
                    },
                    "total_requests": {"$sum": "$count"}
                }
            }
        ]
        
        result = list(api_traffic_collection.aggregate(pipeline))
        
        if result:
            avg_response = round(result[0].get("avg_response_time", 0), 2)
            total_requests = result[0].get("total_requests", 0)
        else:
            avg_response = 0
            total_requests = 0
        
        # Get database performance
        db_start = time.time()
        reviews_collection.count_documents({})
        db_latency = int((time.time() - db_start) * 1000)
        
        # Calculate requests per minute
        requests_per_min = int(total_requests / 60) if total_requests > 0 else 0
        
        return {
            "success": True,
            "avg_response_time_ms": avg_response,
            "db_latency_ms": db_latency,
            "requests_per_minute": requests_per_min,
            "total_requests_last_hour": total_requests,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/correction-trends")
async def get_correction_trends(days: int = 30):
    """
    Get correction submission trends over time
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id.date": 1}
            }
        ]
        
        results = list(corrections_collection.aggregate(pipeline))
        
        # Format data
        trends = {}
        for result in results:
            date = result["_id"]["date"]
            status = result["_id"]["status"]
            count = result["count"]
            
            if date not in trends:
                trends[date] = {
                    "date": date,
                    "pending": 0,
                    "approved": 0,
                    "rejected": 0,
                    "total": 0
                }
            
            if status == "pending_admin_review":
                trends[date]["pending"] = count
            elif status == "approved":
                trends[date]["approved"] = count
            elif status == "rejected":
                trends[date]["rejected"] = count
            
            trends[date]["total"] += count
        
        return {
            "success": True,
            "trends": list(trends.values()),
            "days": days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_correction_trends - Get correction submission trends over time

@app.get("/admin/user-activity-realtime")
async def get_user_activity_realtime(hours: int = 24, granularity: str = "hour"):
    """
    Get real-time user activity with flexible granularity
    granularity: 'hour' or 'minute' (for last hour only)
    """
    try:
        end_time = datetime.utcnow()
        
        if granularity == "minute" and hours <= 1:
            # Minute-level granularity for last hour
            start_time = end_time - timedelta(hours=1)
            time_format = "%Y-%m-%dT%H:%M:00"
            display_format = "%H:%M"
            time_delta = timedelta(minutes=5)  # 5-minute intervals
            intervals = 12  # 12 intervals in an hour
        else:
            # Hour-level granularity
            start_time = end_time - timedelta(hours=hours)
            time_format = "%Y-%m-%dT%H:00:00"
            display_format = "%H:%M"
            time_delta = timedelta(hours=1)
            intervals = hours
        
        # Initialize activity data
        activity_data = []
        current_time = start_time
        
        # Create time slots
        time_slots = []
        while current_time <= end_time:
            time_slots.append({
                "timestamp": current_time,
                "display": current_time.strftime(display_format),
                "full_timestamp": current_time.isoformat()
            })
            current_time += time_delta
        
        # Get reviews data with real-time aggregation
        reviews_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": time_format,
                            "date": "$timestamp"
                        }
                    },
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_id"},
                    "sentiments": {"$push": "$sentiment"}
                }
            }
        ]
        
        reviews_results = list(reviews_collection.aggregate(reviews_pipeline))
        
        # Get corrections data
        corrections_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": time_format,
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_email"}
                }
            }
        ]
        
        corrections_results = list(corrections_collection.aggregate(corrections_pipeline))
        
        # Create lookup maps
        reviews_map = {}
        for result in reviews_results:
            reviews_map[result["_id"]] = result
        
        corrections_map = {}
        for result in corrections_results:
            corrections_map[result["_id"]] = result
        
        # Build activity data
        total_reviews = 0
        total_corrections = 0
        total_users = set()
        max_activity = 0
        peak_hour = None
        
        for slot in time_slots:
            timestamp_key = slot["full_timestamp"]
            
            reviews_count = 0
            corrections_count = 0
            unique_users = set()
            
            # Match reviews
            if timestamp_key in reviews_map:
                reviews_data = reviews_map[timestamp_key]
                reviews_count = reviews_data["count"]
                unique_users.update([u for u in reviews_data["unique_users"] if u])
            
            # Match corrections
            if timestamp_key in corrections_map:
                corrections_data = corrections_map[timestamp_key]
                corrections_count = corrections_data["count"]
                unique_users.update([u for u in corrections_data["unique_users"] if u])
            
            total_activity = reviews_count + corrections_count
            
            activity_data.append({
                "time": slot["display"],
                "full_timestamp": timestamp_key,
                "reviews": reviews_count,
                "corrections": corrections_count,
                "active_users": len(unique_users),
                "total_activity": total_activity
            })
            
            # Track totals
            total_reviews += reviews_count
            total_corrections += corrections_count
            total_users.update(unique_users)
            
            # Track peak
            if total_activity > max_activity:
                max_activity = total_activity
                peak_hour = {
                    "time": slot["display"],
                    "activity": total_activity,
                    "reviews": reviews_count,
                    "corrections": corrections_count
                }
        
        # Get current stats for comparison
        last_hour_reviews = sum(d["reviews"] for d in activity_data[-6:])  # Last 6 intervals
        prev_hour_reviews = sum(d["reviews"] for d in activity_data[-12:-6]) if len(activity_data) >= 12 else 0
        
        trend = "up" if last_hour_reviews > prev_hour_reviews else "down" if last_hour_reviews < prev_hour_reviews else "stable"
        
        return {
            "success": True,
            "activity_data": activity_data,
            "summary": {
                "total_reviews": total_reviews,
                "total_corrections": total_corrections,
                "unique_users": len(total_users),
                "peak_hour": peak_hour,
                "max_activity": max_activity,
                "trend": trend,
                "last_hour_reviews": last_hour_reviews,
                "prev_hour_reviews": prev_hour_reviews
            },
            "metadata": {
                "hours_tracked": hours,
                "granularity": granularity,
                "intervals": len(activity_data),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "last_updated": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        print(f"Error in get_user_activity_realtime: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# END: get_user_activity_realtime - Get real-time user activity with flexible granularity

@app.get("/admin/activity-stats-live")
async def get_activity_stats_live():
    """
    Get live activity statistics (last 5 minutes, last hour, last 24 hours)
    """
    try:
        now = datetime.utcnow()
        
        # Last 5 minutes
        five_min_ago = now - timedelta(minutes=5)
        reviews_5min = reviews_collection.count_documents({"timestamp": {"$gte": five_min_ago}})
        corrections_5min = corrections_collection.count_documents({"created_at": {"$gte": five_min_ago}})
        
        # Last hour
        one_hour_ago = now - timedelta(hours=1)
        reviews_1h = reviews_collection.count_documents({"timestamp": {"$gte": one_hour_ago}})
        corrections_1h = corrections_collection.count_documents({"created_at": {"$gte": one_hour_ago}})
        
        # Last 24 hours
        twenty_four_hours_ago = now - timedelta(hours=24)
        reviews_24h = reviews_collection.count_documents({"timestamp": {"$gte": twenty_four_hours_ago}})
        corrections_24h = corrections_collection.count_documents({"created_at": {"$gte": twenty_four_hours_ago}})
        
        # Active users (last hour)
        active_review_users = reviews_collection.distinct("user_id", {"timestamp": {"$gte": one_hour_ago}})
        active_correction_users = corrections_collection.distinct("user_email", {"created_at": {"$gte": one_hour_ago}})
        active_users = set([u for u in active_review_users + active_correction_users if u])
        
        return {
            "success": True,
            "live_stats": {
                "last_5_minutes": {
                    "reviews": reviews_5min,
                    "corrections": corrections_5min,
                    "total": reviews_5min + corrections_5min
                },
                "last_hour": {
                    "reviews": reviews_1h,
                    "corrections": corrections_1h,
                    "total": reviews_1h + corrections_1h,
                    "active_users": len(active_users)
                },
                "last_24_hours": {
                    "reviews": reviews_24h,
                    "corrections": corrections_24h,
                    "total": reviews_24h + corrections_24h
                }
            },
            "timestamp": now.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_activity_stats_live - Get live activity statistics

@app.post("/user/upload-profile-image")
async def upload_profile_image(
    user_email: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload and save user profile image
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        contents = await file.read()
        
        # Check file size (5MB limit)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        image_data = f"data:{file.content_type};base64,{base64_image}"
        
        # Update user document with profile image
        result = users_collection.update_one(
            {"email": user_email},
            {
                "$set": {
                    "profile_image": image_data,
                    "profile_image_updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": "Profile image uploaded successfully",
            "image_url": image_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: upload_profile_image - Upload and save user profile image

@app.delete("/user/remove-profile-image")
async def remove_profile_image(user_email: str):
    """
    Remove user profile image
    """
    try:
        result = users_collection.update_one(
            {"email": user_email},
            {
                "$unset": {
                    "profile_image": "",
                    "profile_image_updated_at": ""
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": "Profile image removed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: remove_profile_image - Remove user profile image

@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit user feedback with ratings and detailed comments
    """
    try:
        # Validate ratings (1-5 for each aspect)
        valid_aspects = ["dashboard", "sentiment_analysis", "aspect_detection", 
                        "emotion_detection", "active_learning"]
        
        for aspect, rating in feedback.ratings.items():
            if aspect not in valid_aspects:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid aspect: {aspect}"
                )
            if not 1 <= rating <= 5:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Rating must be between 1 and 5"
                )
        
        # Create feedback document
        feedback_doc = {
            "user_email": feedback.user_email,
            "ratings": feedback.ratings,
            "detailed_feedback": feedback.detailed_feedback,
            "timestamp": feedback.timestamp or datetime.utcnow(),
            "status": "unread",  # unread, read, responded
            "admin_response": None,
            "responded_at": None
        }
        
        # Check if user already submitted feedback recently (within 24 hours)
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        existing = feedback_collection.find_one({
            "user_email": feedback.user_email,
            "timestamp": {"$gte": twenty_four_hours_ago}
        })
        
        if existing:
            # Update existing feedback
            feedback_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": feedback_doc}
            )
            feedback_id = str(existing["_id"])
            message = "Feedback updated successfully"
        else:
            # Insert new feedback
            result = feedback_collection.insert_one(feedback_doc)
            feedback_id = str(result.inserted_id)
            message = "Feedback submitted successfully"
        
        return FeedbackResponse(
            success=True,
            message=message,
            feedback_id=feedback_id
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in submit_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# END: submit_feedback - Submit user feedback with ratings and detailed comments

@app.get("/feedback/user/{user_email}")
async def get_user_feedback(user_email: str, limit: int = 10):
    """
    Get feedback history for a specific user
    """
    try:
        feedbacks = list(
            feedback_collection.find({"user_email": user_email})
            .sort("timestamp", -1)
            .limit(limit)
        )
        
        for feedback in feedbacks:
            feedback["_id"] = str(feedback["_id"])
            feedback["timestamp"] = feedback["timestamp"].isoformat()
            if feedback.get("responded_at"):
                feedback["responded_at"] = feedback["responded_at"].isoformat()
        
        return {
            "success": True,
            "feedbacks": feedbacks,
            "count": len(feedbacks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_user_feedback - Get feedback history for a specific user

@app.get("/admin/feedback")
async def get_all_feedback(
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Get all user feedback for admin review
    """
    try:
        query = {}
        if status:
            query["status"] = status
        
        feedbacks = list(
            feedback_collection.find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        
        # Enrich with user info
        for feedback in feedbacks:
            feedback["_id"] = str(feedback["_id"])
            feedback["timestamp"] = feedback["timestamp"].isoformat()
            if feedback.get("responded_at"):
                feedback["responded_at"] = feedback["responded_at"].isoformat()
            
            # Get user details
            user = users_collection.find_one({"email": feedback["user_email"]})
            if user:
                feedback["user_name"] = user.get("name", "Unknown")
                feedback["user_profile_image"] = user.get("profile_image")
        
        total_count = feedback_collection.count_documents(query)
        
        return {
            "success": True,
            "feedbacks": feedbacks,
            "count": len(feedbacks),
            "total": total_count
        }
    except Exception as e:
        print(f"Error in get_all_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# END: get_all_feedback - Get all user feedback for admin review

@app.get("/admin/feedback/stats")
async def get_feedback_stats():
    """
    Get feedback statistics for admin dashboard
    """
    try:
        total_feedback = feedback_collection.count_documents({})
        unread_feedback = feedback_collection.count_documents({"status": "unread"})
        
        # Calculate average ratings for each aspect
        pipeline = [
            {
                "$project": {
                    "ratings_array": {"$objectToArray": "$ratings"}
                }
            },
            {
                "$unwind": "$ratings_array"
            },
            {
                "$group": {
                    "_id": "$ratings_array.k",
                    "avg_rating": {"$avg": "$ratings_array.v"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        ratings_results = list(feedback_collection.aggregate(pipeline))
        
        average_ratings = {
            result["_id"]: {
                "average": round(result["avg_rating"], 2),
                "count": result["count"]
            }
            for result in ratings_results
        }
        
        # Overall satisfaction (average of all ratings)
        overall_avg = sum(r["avg_rating"] for r in ratings_results) / len(ratings_results) if ratings_results else 0
        
        return {
            "success": True,
            "total_feedback": total_feedback,
            "unread_feedback": unread_feedback,
            "average_ratings": average_ratings,
            "overall_satisfaction": round(overall_avg, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: get_feedback_stats - Get feedback statistics for admin dashboard

@app.patch("/admin/feedback/{feedback_id}")
async def update_feedback_status(
    feedback_id: str,
    status: str,
    admin_response: Optional[str] = None
):
    """
    Update feedback status and optionally add admin response
    """
    try:
        update_doc = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if admin_response:
            update_doc["admin_response"] = admin_response
            update_doc["responded_at"] = datetime.utcnow()
        
        result = feedback_collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        return {
            "success": True,
            "message": "Feedback updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: update_feedback_status - Update feedback status and optionally add admin response

@app.delete("/admin/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str):
    """
    Delete a feedback entry
    """
    try:
        result = feedback_collection.delete_one({"_id": ObjectId(feedback_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        return {
            "success": True,
            "message": "Feedback deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: delete_feedback - Delete a feedback entry

@app.patch("/admin/feedback/{feedback_id}")
async def update_feedback_status(feedback_id: str, update_data: UpdateFeedback):
    """
    Update feedback status and optionally add admin response
    """
    try:
        update_doc = {
            "status": update_data.status,
            "updated_at": datetime.utcnow()
        }
        
        if update_data.admin_response:
            update_doc["admin_response"] = update_data.admin_response
            update_doc["responded_at"] = datetime.utcnow()
        
        result = feedback_collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        return {
            "success": True,
            "message": "Feedback updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# END: update_feedback_status - Update feedback status and optionally add admin response

@app.get("/user/profile-image/{user_email}")
async def get_profile_image(user_email: str):
    """
    Get user profile image
    """
    try:
        user = users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "profile_image": user.get("profile_image", None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Main entry point - Run FastAPI application with uvicorn

# ============================================
# Run with: uvicorn sentiment_api:app --reload
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
# END: Main entry point - Run FastAPI application with uvicorn
