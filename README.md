# Sentiment+

Sentiment+ is a robust full-stack application designed to transform unstructured raw data into structured, actionable insights using Aspect-Based Sentiment Analysis (ABSA) and Active Learning. By leveraging state-of-the-art NLP models like RoBERTa and KeyBERT, the platform provides deep, granular analysis across domains such as product reviews, food, and travel.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
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
   - MONGODB_URI
   - NEXTAUTH_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET

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

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
