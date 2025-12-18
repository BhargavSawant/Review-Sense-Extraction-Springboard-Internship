# Sentiment+

Sentiment+ is a robust full-stack application designed to transform unstructured raw data into structured, actionable insights using Aspect-Based Sentiment Analysis (ABSA) and Active Learning. By leveraging state-of-the-art NLP models like RoBERTa and KeyBERT, the platform provides deep, granular analysis across domains such as product reviews, food, and travel.

---

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

---

## Features

- **Sentiment Analysis**  
  Real-time sentiment classification using fine-tuned transformer models.

- **Aspect Detection**  
  Automated extraction of 20+ domain-agnostic aspects using KeyBERT with Maximal Marginal Relevance (MMR) for contextual relevance.

- **Emotion Distribution**  
  Multi-dimensional emotion tracking (Joy, Trust, Anger, Anticipation, Sadness) derived from aspect-level sentiment outputs.

- **Active Learning Feedback Loop**  
  Users can correct predictions, which are queued for administrator verification and future model retraining.

- **Bulk Review Analysis**  
  Supports CSV and Excel uploads for large-scale sentiment processing with aggregated insights.

- **Admin Verification Workflow**  
  Dedicated admin interface to approve, reject, or refine user-submitted corrections.

- **System Monitoring & Analytics**  
  Tracks API health, CPU and memory usage, database latency, and request traffic.

---

## Technologies Used

### Backend

- **Python (FastAPI)** – High-performance REST API framework  
- **Hugging Face Transformers** – RoBERTa-based sentiment models  
- **KeyBERT** – Keyword and aspect extraction  
- **MongoDB** – Storage for reviews, feedback, analytics, and user data  
- **psutil** – Infrastructure monitoring

### Frontend

- **Next.js (App Router)** – Modern React framework  
- **NextAuth.js** – Authentication with Credentials and Google Provider  
- **Tailwind CSS** – Utility-first styling system  
- **Lucide React** – Icons  
- **Chart.js & Recharts** – Data visualization

---

## Prerequisites

- **Node.js**: Version 18 or higher  
- **Python**: Version 3.8 or higher  
- **MongoDB**: Local instance or MongoDB Atlas  
- **Environment Variables**: `.env` files for backend and frontend

---

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   
   source venv/bin/activate      # Linux / macOS
   venv\Scripts\activate         # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
   
2. Install dependencies:
   ```bash
   npm install next next-auth lucide-react chart.js react-chartjs-2 recharts
   ```
   
3. Configure the .env.local file with:
   MONGODB_URI
   NEXTAUTH_SECRET
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET

---

### Usage
1. Start the Backend API
   ```bash
   uvicorn sentiment_api:app --reload --port 8000
   ```
   
2. Start the Frontend Application
   ```bash
   npm run dev
   ```
   
3. Access the Application
   ```bash
   http://localhost:3000
   ```

---

## Architecture

The application follows a decoupled, scalable architecture:

- **Frontend (Next.js)**  
  Handles UI rendering, authentication, dashboards, and active learning workflows.

- **Backend (FastAPI)**  
  Performs sentiment analysis, aspect extraction, feedback handling, and analytics.

- **Authentication Layer**  
  NextAuth manages user sessions and role-based access control.

- **Database Layer**  
  A shared MongoDB instance stores reviews, corrections, users, and metrics.

---

## API Documentation

The Sentiment+ backend exposes RESTful endpoints via FastAPI.

### Core Analysis Endpoints

- **Analyze Single Review**  
  `POST /analyze-single`  
  Performs full ABSA on a single review and extracts aspect-level sentiments.

- **Bulk Upload Reviews**  
  `POST /upload-reviews`  
  Accepts CSV or Excel files for large-scale sentiment analysis.

- **Legacy Prediction**  
  `POST /predict`  
  Performs basic sentiment classification without aspect extraction.

---

### Active Learning & Feedback

- **Submit Correction**  
  `POST /corrections`  
  Allows users to submit corrected sentiment or aspect labels.

- **User Training Statistics**  
  `GET /user-training-stats`  
  Fetches contribution statistics for a specific user.

- **Submit Feedback**  
  `POST /feedback`  
  Collects usability and accuracy feedback from users.

---

### Admin Management

- **Pending Corrections**  
  `GET /admin/pending-corrections`  
  Retrieves all user-submitted corrections awaiting approval.

- **Approve Correction**  
  `POST /admin/corrections/{id}/approve`  
  Moves validated corrections into the training dataset.

- **User Management**  
  `GET /admin/users`  
  Lists registered users with roles and activity data.

---

### System Health & Analytics

- **System Health**  
  `GET /admin/system-health`  
  Reports API and database latency.

- **Infrastructure Metrics**  
  `GET /admin/infrastructure-metrics`  
  Returns CPU, memory, and disk usage.

- **API Traffic Analytics**  
  `GET /admin/api-traffic`  
  Tracks request volume and average response time.

---

### License

Distributed under the MIT License.
