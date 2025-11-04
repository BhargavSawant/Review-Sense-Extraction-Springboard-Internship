//frontend\src\app\history\page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [showCleaned, setShowCleaned] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchUserReviews();
      fetchUserStats();
    }
  }, [status, filter]);

  const fetchUserReviews = async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    setError("");
    try {
      let url = `/api/sentiment?limit=100&user_email=${session.user.email}`;
      if (filter !== "all") {
        url += `&sentiment=${filter}`;
      }
      
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

  const fetchUserStats = async () => {
    if (!session?.user?.email) return;
    
    try {
      const res = await fetch(`http://localhost:8000/stats?user_email=${session.user.email}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/reviews/${reviewId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete review");
      
      // Refresh the list
      fetchUserReviews();
      fetchUserStats();
    } catch (err) {
      alert("Error deleting review: " + err.message);
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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Review History</h1>
          <p className="text-gray-600 mt-2">
            Your personal sentiment analysis history - {session.user.email}
          </p>
        </div>

        {/* User Statistics */}
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

        {/* Filter and View Options */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCleaned(!showCleaned)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  showCleaned
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {showCleaned ? "Show Original" : "Show Cleaned Text"}
              </button>
              <button
                onClick={fetchUserReviews}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
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
              Start analyzing text on the Analysis page to see your history here
            </p>
            <button
              onClick={() => router.push("/analysis")}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Analysis
            </button>
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
                    
                    {/* Toggle between original and cleaned text */}
                    <div className="mb-2">
                      {showCleaned && review.cleaned_text ? (
                        <div>
                          <span className="text-xs font-semibold text-purple-600 uppercase">
                            Cleaned/Tokenized:
                          </span>
                          <p className="text-gray-700 mt-1 bg-purple-50 p-3 rounded border border-purple-200">
                            {review.cleaned_text}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 uppercase">
                            Original:
                          </span>
                          <p className="text-gray-700 mt-1">{review.text}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {new Date(review.timestamp).toLocaleString()}
                      </div>
                      <button
                        onClick={() => deleteReview(review._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
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