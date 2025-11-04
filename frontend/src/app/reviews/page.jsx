//frontend\src\app\reviews\page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ReviewsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  if (!session) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [filter]);

  const fetchReviews = async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter === "all" 
        ? "/api/sentiment?limit=100"
        : `/api/sentiment?limit=100&sentiment=${filter}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-300";
      case "negative":
        return "bg-red-100 text-red-800 border-red-300";
      case "neutral":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case "positive": return "😊";
      case "negative": return "😞";
      case "neutral": return "😐";
      default: return "😐";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Saved Reviews</h1>
          <p className="text-gray-600 mt-2">
            View all sentiment analysis results stored in the database
          </p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Reviews</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
              <div className="text-sm text-green-700">Positive</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.positive}
              </div>
              <div className="text-xs text-green-600">
                {stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-700">Neutral</div>
              <div className="text-2xl font-bold text-gray-600">
                {stats.neutral}
              </div>
              <div className="text-xs text-gray-600">
                {stats.total > 0 ? Math.round((stats.neutral / stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
              <div className="text-sm text-red-700">Negative</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.negative}
              </div>
              <div className="text-xs text-red-600">
                {stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("positive")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "positive"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Positive
            </button>
            <button
              onClick={() => setFilter("neutral")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "neutral"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Neutral
            </button>
            <button
              onClick={() => setFilter("negative")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === "negative"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Negative
            </button>
            <button
              onClick={fetchReviews}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No reviews found</p>
            <p className="text-gray-400 text-sm mt-2">
              Start analyzing text to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">
                        {getSentimentEmoji(review.sentiment)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold border ${getSentimentColor(
                          review.sentiment
                        )}`}
                      >
                        {review.sentiment.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Confidence: {(review.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{review.text}</p>
                    <div className="text-xs text-gray-400">
                      {new Date(review.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}