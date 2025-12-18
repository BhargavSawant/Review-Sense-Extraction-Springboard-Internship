
Sentiment+
Sentiment+ is a robust full-stack application designed to transform unstructured raw data into structured, actionable insights using Aspect-Based Sentiment Analysis (ABSA) and Active Learning. By leveraging state-of-the-art NLP models like RoBERTa and KeyBERT, the platform provides deep granular analysis across various domains such as product reviews, food, and travel.

Table of Contents
Features

Technologies Used

Architecture

Prerequisites

Installation

Usage

License

Features
Sentiment Analysis: Real-time sentiment classification using fine-tuned models.

Aspect Detection: Automated extraction of 20+ domain-agnostic aspects using KeyBERT with Maximal Marginal Relevance (MMR) for context awareness.

Emotion Distribution: Multi-dimensional emotion tracking (Joy, Trust, Anger, Anticipation, Sadness) derived from aspect-level sentiments.

Active Learning Feedback Loop: A complete system where users can correct model predictions, which are then queued for admin review and model retraining.

Bulk Analysis: Support for CSV/Excel uploads to process hundreds of reviews simultaneously with aggregated reporting.

Admin Verification: A specialized interface for administrators to verify, refine, or discard user-suggested corrections before model integration.

System Monitoring: Comprehensive health metrics including CPU/Memory usage, API traffic tracking, and database latency.

Technologies Used
Backend
Python (FastAPI): High-performance API framework.


Transformers (Hugging Face): Implementation of RoBERTa for sentiment analysis.


KeyBERT: BERTopic-based keyword extraction for aspect detection.


MongoDB: Document-oriented database for storing reviews, corrections, and traffic analytics.

Frontend
Next.js (App Router): React framework for the user interface.

NextAuth.js: Secure authentication supporting Credentials and Google Providers.

Tailwind CSS: Utility-first styling for a responsive and modern dashboard.

Lucide React: Iconography for navigation and data visualization.

Chart.js & Recharts: Data visualization for sentiment trends and system metrics.

Architecture
Prerequisites
Node.js: Version 18.0 or higher.

Python: Version 3.8 or higher.

MongoDB: A running instance (local or Atlas).

Environment Variables: Create a .env file in the root of both the backend and frontend directories.

Installation
Backend Setup
Navigate to the backend directory: cd backend

Create and activate a virtual environment: python -m venv venv source venv/bin/activate (Linux/macOS) or venv\Scripts\activate (Windows)

Install dependencies:


pip install -r requirements.txt 

Frontend Setup
Navigate to the frontend directory: cd frontend

Install dependencies: npm install

Configure the .env.local file with your MONGODB_URI, NEXTAUTH_SECRET, and GOOGLE_CLIENT_ID/SECRET.

Usage
1. Start the Backend API
Run the FastAPI server using Uvicorn: uvicorn sentiment_api:app --reload --port 8000

2. Start the Frontend Application
Run the Next.js development server: npm run dev

3. Access the Application
Open http://localhost:3000 in your browser.

Analysis Page: Input single reviews or upload bulk files for instant ABSA.

Active Learning: Users can provide feedback on predictions to improve model accuracy over time.

Admin Panel: Administrators (e.g., admin@sentimentplus.com) can verify pending corrections, manage users, and trigger model training batches.

License
Distributed under the MIT License.
