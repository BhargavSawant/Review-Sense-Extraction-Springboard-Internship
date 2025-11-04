# backend/sentiment_api.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline
from typing import List, Optional
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

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

# Load sentiment model (loads once when server starts)
print("Loading sentiment model...")
MODEL_PATH = "./my_finetuned_sentiment_model"
sentiment_classifier = pipeline("sentiment-analysis", model=MODEL_PATH)
print("Model loaded successfully!")

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
    user_id: Optional[str] = None  # Include user_id in response

# ============================================
# Helper Functions
# ============================================

def predict_sentiment(text: str) -> dict:
    """
    Predict sentiment for a single text
    """
    result = sentiment_classifier(text)[0]
    
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
    results = sentiment_classifier(texts, batch_size=32)
    
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
        "message": "Sentiment Analysis API",
        "version": "1.0",
        "endpoints": ["/predict", "/batch-predict", "/save-review", "/reviews"]
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
            "user_id": review.user_id,  # This is now the user's email
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
            user_id=document.get('user_id')  # Include user_id in response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reviews")
def get_reviews(
    limit: int = 50, 
    sentiment: Optional[str] = None,
    product_id: Optional[str] = None,
    user_email: Optional[str] = None  # NEW: Filter by user email
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
            query['user_id'] = user_email  # Filter by user email
        
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
    user_email: Optional[str] = None  # NEW: Stats for specific user
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
        from bson import ObjectId
        result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {"message": "Review deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW: Endpoint to get user-specific reviews
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

# ============================================
# Run with: uvicorn sentiment_api:app --reload
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)