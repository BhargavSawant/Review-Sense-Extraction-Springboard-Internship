# Sentiment+

Sentiment+ is a robust full-stack application designed to transform unstructured raw data into structured, actionable insights using Aspect-Based Sentiment Analysis (ABSA) and Active Learning. By leveraging state-of-the-art NLP models like RoBERTa and KeyBERT, the platform provides deep granular analysis across various domains such as product reviews, food, and travel.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Features

- **Sentiment Analysis:** Real-time sentiment classification using fine-tuned models.
- **Aspect Detection:** Automated extraction of 20+ domain-agnostic aspects using KeyBERT with Maximal Marginal Relevance (MMR) for context awareness.
- **Emotion Distribution:** Multi-dimensional emotion tracking (Joy, Trust, Anger, Anticipation, Sadness) derived from aspect-level sentiments.
- **Active Learning Feedback Loop:** A complete system where users can correct model predictions, which are then queued for admin review and model retraining.
- **Bulk Analysis:** Support for CSV/Excel uploads to process hundreds of reviews simultaneously with aggregated reporting.
- **Admin Verification:** A specialized interface for administrators to verify, refine, or discard user-suggested corrections before model integration.
- **System Monitoring:** Comprehensive health metrics including CPU/Memory usage, API traffic tracking, and database latency.

## Technologies Used

### Backend
- **Python (FastAPI):** High-performance API framework.
- **Transformers (Hugging Face):** Implementation of RoBERTa for sentiment analysis.
- **KeyBERT:** BERTopic-based keyword extraction for aspect detection.
- **MongoDB:** Document-oriented database for storing reviews, corrections, and traffic analytics.

### Frontend
- **Next.js (App Router):** React framework for the user interface.
- **NextAuth.js:** Secure authentication supporting Credentials and Google Providers.
- **Tailwind CSS:** Utility-first styling for a responsive and modern dashboard.
- **Lucide React:** Iconography for navigation and data visualization.
- **Chart.js & Recharts:** Data visualization for sentiment trends and system metrics.

## Architecture

The system utilizes a decoupled architecture where the Next.js frontend handles authentication (via NextAuth) and UI rendering, while the FastAPI backend manages the heavy lifting for NLP tasks.

- **NextAuth Integration:** The frontend handles authentication via Google or Credentials providers, storing user sessions and roles in the `sentiment_db`.
- **Database Utility:** A centralized MongoClient utility manages connections for both the Next.js frontend and the FastAPI backend.

## API Documentation

The Sentiment+ backend is powered by FastAPI. Below are the primary endpoints available.

### Core Analysis Endpoints
- `POST /analyze-single`: Performs full Aspect-Based Sentiment Analysis (ABSA) on a single text string. Extracts up to 20 aspects using KeyBERT and assigns sentiment to each.
- `POST /upload-reviews`: Accepts CSV or Excel files for large-scale analysis. Returns aggregated insights and individual analysis for the first 50 reviews.
- `POST /predict`: **(Legacy)** A simplified endpoint for basic sentiment classification without aspect extraction.

### Active Learning and Feedback
- `POST /corrections`: Allows users to suggest corrections for misclassified sentiments or aspects.
- `GET /user-training-stats`: Retrieves statistics on a specific user's contributions to the training pool.
- `POST /feedback`: Collects user ratings on system performance across categories like dashboard usability and analysis accuracy.

### Admin Management
- `GET /admin/pending-corrections`: Lists all user-submitted corrections awaiting administrator approval.
- `POST /admin/corrections/{id}/approve`: Validates a user correction and moves it into the model training queue.
- `GET /admin/users`: Provides a searchable list of all registered users, their roles, and activity levels.

### System Health and Analytics
- `GET /admin/system-health`: Returns real-time latency for the API and MongoDB, along with overall status.
- `GET /admin/infrastructure-metrics`: Monitors server-level CPU, Memory, and Disk usage using psutil.
- `GET /admin/api-traffic`: Tracks request counts and average response times over a 24-hour period.

## Prerequisites

- **Node.js:** Version 18.0 or higher.
- **Python:** Version 3.8 or higher.
- **MongoDB:** A running instance (local or Atlas).
- **Environment Variables:** You must create a `.env` file in the root of both the `backend` and `frontend` directories.

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   # Create
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate 

# Activate (Windows)
venv\Scripts\activate

pip install -r requirements.txt

cd frontend
