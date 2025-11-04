// lib/sentimentApi.js
// API client for sentiment analysis

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const sentimentApi = {
  // Predict sentiment for single text
  async predict(text) {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) throw new Error('Prediction failed');
    return response.json();
  },

  // Predict multiple reviews
  async batchPredict(reviews) {
    const response = await fetch(`${API_BASE_URL}/batch-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews }),
    });
    
    if (!response.ok) throw new Error('Batch prediction failed');
    return response.json();
  },

  // Save review with sentiment
  async saveReview(data) {
    const response = await fetch(`${API_BASE_URL}/save-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to save review');
    return response.json();
  },

  // Get reviews
  async getReviews(params) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE_URL}/reviews?${queryParams}`);
    
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },

  // Get stats
  async getStats(product_id) {
    const url = product_id 
      ? `${API_BASE_URL}/stats?product_id=${product_id}`
      : `${API_BASE_URL}/stats`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};