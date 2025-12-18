//frontend\src\app\user\history\page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Calendar,
  Trash2,
  Eye,
  Download,
  X,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle,
  Smile,
  Meh,
  Frown,
  Tag,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #E6E2DD;
    border-radius: 20px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #D0CCC7;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #475569;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #64748b;
  }
  .feedback-modal {
    overflow-anchor: none;
  }
`;

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [topAspects, setTopAspects] = useState([]);

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRatings, setFeedbackRatings] = useState({
    dashboard: 3,
    sentiment_analysis: 3,
    aspect_detection: 3,
    emotion_detection: 3,
    active_learning: 3,
  });
  const [detailedFeedback, setDetailedFeedback] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  // Sentiment level configurations (using Lucide icons instead of emojis)
  const sentimentLevels = [
    {
      value: 1,
      label: "Very Dissatisfied",
      icon: Frown,
      color: "text-red-500",
    },
    { value: 2, label: "Dissatisfied", icon: Frown, color: "text-orange-500" },
    { value: 3, label: "Neutral", icon: Meh, color: "text-yellow-500" },
    { value: 4, label: "Satisfied", icon: Smile, color: "text-green-500" },
    { value: 5, label: "Very Satisfied", icon: Smile, color: "text-green-600" },
  ];

  const aspectLabels = {
    dashboard: "Dashboard Experience",
    sentiment_analysis: "Sentiment Analysis",
    aspect_detection: "Aspect Detection",
    emotion_detection: "Emotion Detection",
    active_learning: "Active Learning",
  };

  // Detect system theme
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setIsDark(isDarkMode);
      document.documentElement.classList.toggle("dark", isDarkMode);
    };

    checkTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkTheme);

    return () => mediaQuery.removeEventListener("change", checkTheme);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchUserReviews();
      fetchUserStats();
      fetchUserTopAspects();
    }
  }, [status, filter]);

  // Maintain cursor position in textarea
  useEffect(() => {
    if (
      textareaRef.current &&
      showFeedbackModal &&
      !feedbackSuccess &&
      !feedbackSubmitting
    ) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [
    detailedFeedback,
    showFeedbackModal,
    feedbackSuccess,
    feedbackSubmitting,
    cursorPosition,
  ]);

  const handleDetailedFeedbackChange = (e) => {
    const newValue = e.target.value;
    setDetailedFeedback(newValue);
    setCursorPosition(e.target.selectionStart);
  };

  const handleFeedbackSubmit = async () => {
    if (!session?.user?.email) return;

    setFeedbackSubmitting(true);
    try {
      const response = await fetch("http://localhost:8000/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: session.user.email,
          ratings: feedbackRatings,
          detailed_feedback: detailedFeedback.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess(false);
          setDetailedFeedback("");
          setFeedbackRatings({
            dashboard: 3,
            sentiment_analysis: 3,
            aspect_detection: 3,
            emotion_detection: 3,
            active_learning: 3,
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Feedback Button Component (add to the page)
  const FeedbackButton = () => (
    <button
      onClick={() => setShowFeedbackModal(true)}
      className="fixed bottom-6 right-6 bg-[#4A7DFF] hover:bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition-all hover:scale-105 z-40"
    >
      <MessageSquare className="w-5 h-5" />
      <span className="font-medium">Give Feedback</span>
    </button>
  );

  // Feedback Modal Component
  const FeedbackModal = () =>
    showFeedbackModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => !feedbackSubmitting && setShowFeedbackModal(false)}
        ></div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar feedback-modal">
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-[#E6E2DD] dark:border-slate-700 p-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-white">
                Share Your Feedback
              </h3>
              <p className="text-sm text-[#6E6E6E] dark:text-slate-400 mt-1">
                Help us improve your experience
              </p>
            </div>
            <button
              onClick={() => !feedbackSubmitting && setShowFeedbackModal(false)}
              disabled={feedbackSubmitting}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#6E6E6E] dark:text-slate-400" />
            </button>
          </div>

          {feedbackSuccess ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-xl font-bold text-[#2C2C2C] dark:text-white mb-2">
                Thank You!
              </h4>
              <p className="text-[#6E6E6E] dark:text-slate-400">
                Your feedback has been submitted successfully.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Rating Sections */}
              {Object.entries(aspectLabels).map(([aspect, label]) => (
                <div key={aspect} className="space-y-3">
                  <label className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                    {label}
                  </label>
                  <div className="flex gap-2 justify-between">
                    {sentimentLevels.map((level) => (
                      <button
                        key={level.value}
                        onClick={() =>
                          setFeedbackRatings((prev) => ({
                            ...prev,
                            [aspect]: level.value,
                          }))
                        }
                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                          feedbackRatings[aspect] === level.value
                            ? "border-[#4A7DFF] bg-blue-50 dark:bg-blue-900/20"
                            : "border-[#E6E2DD] dark:border-slate-600 hover:border-[#4A7DFF]/50"
                        }`}
                        title={level.label}
                      >
                        <div className="text-3xl mb-1 flex justify-center">
                          <level.icon
                            className={`w-6 h-6 ${
                              feedbackRatings[aspect] === level.value
                                ? "text-[#4A7DFF]"
                                : level.color
                            }`}
                          />
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            feedbackRatings[aspect] === level.value
                              ? "text-[#4A7DFF]"
                              : "text-[#6E6E6E] dark:text-slate-400"
                          }`}
                        >
                          {level.value}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Detailed Feedback */}
              <div className="space-y-3 pt-4 border-t border-[#E6E2DD] dark:border-slate-700">
                <label className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                  Additional Comments (Optional)
                </label>
                <textarea
                  ref={textareaRef}
                  value={detailedFeedback}
                  onChange={handleDetailedFeedbackChange}
                  placeholder="Tell us more about your experience, suggestions for improvement, or any issues you encountered..."
                  className="w-full px-4 py-3 border border-[#E6E2DD] dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white placeholder:text-gray-400 resize-none"
                  rows={4}
                  maxLength={1000}
                />
                <div className="text-xs text-[#6E6E6E] dark:text-slate-400 text-right">
                  {detailedFeedback.length}/1000 characters
                </div>
              </div>
            </div>
          )}

          {!feedbackSuccess && (
            <div className="p-6 border-t border-[#E6E2DD] dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                disabled={feedbackSubmitting}
                className="px-6 py-2.5 border border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
                className="px-6 py-2.5 bg-[#4A7DFF] text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-[#4A7DFF]/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {feedbackSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );

  const fetchUserReviews = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    setError("");
    try {
      let url = `http://localhost:8000/reviews?limit=100&user_email=${session.user.email}`;
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
      const res = await fetch(
        `http://localhost:8000/stats?user_email=${session.user.email}`
      );
      if (!res.ok) throw new Error("Failed to fetch stats");

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  //Fetch top aspects (mirroring dashboard fetch)
  const fetchUserTopAspects = async () => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch(
        `http://localhost:8000/top-aspects?user_email=${session.user.email}&limit=10`
      );
      if (!res.ok) throw new Error("Failed to fetch top aspects");

      const data = await res.json();
      setTopAspects(data.aspects || []);
    } catch (err) {
      console.error("Top aspects error:", err);
    }
  };

  const handleDeleteClick = (reviewId) => {
    setDeleteId(reviewId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`http://localhost:8000/reviews/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete review");

      setShowDeleteModal(false);
      setDeleteId(null);
      fetchUserReviews();
      fetchUserStats();
      fetchUserTopAspects();
    } catch (err) {
      setError("Error deleting review: " + err.message);
    }
  };

  const handleViewClick = (review) => {
    setSelectedReview(review);
    setShowViewModal(true);
  };

  const getSentimentColor = (sentiment) => {
    // Handle undefined or null sentiment values
    if (!sentiment) {
      return {
        bg: "bg-gray-50 dark:bg-slate-700",
        text: "text-gray-700 dark:text-slate-400",
        border: "border-gray-200 dark:border-slate-600",
        badge: "bg-gray-100 dark:bg-slate-700",
      };
    }
    //Top Aspects Chart Data (horizontal bar, mirroring dashboard emotion chart)
    const topAspectsData =
      topAspects.length > 0
        ? {
            labels: topAspects.map((a) => a.name),
            datasets: [
              {
                data: topAspects.map((a) => a.count),
                backgroundColor: topAspects.map(
                  (_, idx) =>
                    `hsl(${(idx * 360) / topAspects.length}, 70%, 50%)`
                ), // Dynamic colors
                borderRadius: 4,
                barThickness: 20,
              },
            ],
          }
        : null;

    // Bar Options for horizontal aspects chart
    const barOptions = {
      indexAxis: "y", // Horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          titleColor: isDark ? "#f1f5f9" : "#0f172a",
          bodyColor: isDark ? "#cbd5e1" : "#475569",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          borderWidth: 1,
        },
      },
      scales: {
        x: { display: false },
        y: {
          grid: { display: false },
          ticks: {
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 12 },
            callback: function (value, index) {
              return topAspects[index]?.name || ""; // Show aspect name on y-axis
            },
          },
        },
      },
    };
    const sentimentLower = sentiment.toLowerCase();
    switch (sentimentLower) {
      case "positive":
        return {
          bg: "bg-green-50 dark:bg-green-900/30",
          text: "text-green-700 dark:text-green-400",
          border: "border-green-200 dark:border-green-700",
          badge: "bg-green-100 dark:bg-green-900/30",
        };
      case "negative":
        return {
          bg: "bg-red-50 dark:bg-red-900/30",
          text: "text-red-700 dark:text-red-400",
          border: "border-red-200 dark:border-red-700",
          badge: "bg-red-100 dark:bg-red-900/30",
        };
      case "neutral":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/30",
          text: "text-yellow-700 dark:text-yellow-400",
          border: "border-yellow-200 dark:border-yellow-700",
          badge: "bg-yellow-100 dark:bg-yellow-900/30",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-slate-700",
          text: "text-gray-700 dark:text-slate-400",
          border: "border-gray-200 dark:border-slate-600",
          badge: "bg-gray-100 dark:bg-slate-700",
        };
    }
  };

  // In the component body, update the filteredReviews (around line 461):
  const filteredReviews = reviews.filter((review) => {
    const searchLower = searchQuery.toLowerCase();

    // For single reviews: search text and user
    if (review.text) {
      return (
        review.text.toLowerCase().includes(searchLower) ||
        (review.user_id || review.user)?.toLowerCase().includes(searchLower)
      );
    }

    // For bulk summaries: search product_name or file_name
    if (review.analysis_type === "bulk") {
      return (
        (review.product_name || "").toLowerCase().includes(searchLower) ||
        (review.file_name || "").toLowerCase().includes(searchLower) ||
        (review.user_id || "").toLowerCase().includes(searchLower)
      );
    }

    // Fallback: include if no search query
    return !searchQuery;
  });

  // Update the review mapping in JSX (inside the <div className="divide-y ...">, around where it renders each review):
  {
    filteredReviews.map((review) => {
      const isBulk = review.analysis_type === "bulk";
      const colors = getSentimentColor(review.sentiment || "neutral"); // Default to neutral for bulk

      return (
        <div
          key={review._id}
          className="p-4 flex items-start gap-4 hover:bg-[#FAF8F5]/50 dark:hover:bg-slate-700/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-[#E6E2DD] dark:border-slate-600 flex items-center justify-center text-sm font-bold text-[#6E6E6E] dark:text-slate-300 flex-shrink-0">
            {isBulk
              ? "B"
              : (review.user_id || review.user || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-bold text-[#2C2C2C] dark:text-white text-sm">
                  {isBulk
                    ? `Bulk Analysis: ${
                        review.product_name ||
                        review.file_name ||
                        "Unnamed Batch"
                      }`
                    : review.user_id || review.user || "Anonymous"}
                </span>
                <span className="text-xs text-[#6E6E6E] dark:text-slate-400 ml-2">
                  {new Date(review.timestamp).toLocaleDateString()}
                </span>
                {isBulk && (
                  <span className="text-xs text-[#4A7DFF] ml-2">
                    ({review.total_reviews || 0} reviews)
                  </span>
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isBulk && (
                  <button
                    onClick={() => handleViewClick(review)}
                    className="p-1 text-[#4A7DFF] hover:text-[#3A6DE5] transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  className="p-1 text-[#4CD4A5] hover:text-[#3CB485] transition-colors"
                  title="Download"
                  onClick={() => {
                    // TODO: Implement bulk download if needed (e.g., fetch aggregated_results)
                    alert("Download not implemented for bulk yet.");
                  }}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(review._id)}
                  className="p-1 text-[#6E6E6E] dark:text-slate-400 hover:text-[#E95252] transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!isBulk ? (
              // Original single review display
              <>
                <p className="text-sm text-[#2C2C2C] dark:text-slate-300 mt-1 line-clamp-2">
                  "{review.text}"
                </p>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${colors.badge} ${colors.text}`}
                  >
                    {review.sentiment}
                  </span>
                  {review.aspects && review.aspects[0] && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4A7DFF]/10 text-[#4A7DFF] border border-[#4A7DFF]/20">
                      Aspect: {review.aspects[0].aspect}
                    </span>
                  )}
                </div>
              </>
            ) : (
              // Bulk summary display
              <div className="mt-1 text-sm text-[#6E6E6E] dark:text-slate-400">
                <p className="line-clamp-2">
                  Summary analysis of {review.total_reviews || 0} reviews from "
                  {review.file_name || "uploaded file"}".
                </p>
                {review.aggregated_results && (
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>
                      Positive:{" "}
                      {(
                        review.aggregated_results.overall_percentage
                          ?.positive || 0
                      ).toFixed(0)}
                      %
                    </span>
                    <span>
                      Neutral:{" "}
                      {(
                        review.aggregated_results.overall_percentage?.neutral ||
                        0
                      ).toFixed(0)}
                      %
                    </span>
                    <span>
                      Negative:{" "}
                      {(
                        review.aggregated_results.overall_percentage
                          ?.negative || 0
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  }

  const topAspectsData = {
    labels: ["Battery", "Price", "Support", "Quality", "Shipping"],
    datasets: [
      {
        label: "Mentions",
        data: [2450, 1890, 1200, 980, 850],
        backgroundColor: [
          "#4A7DFF",
          "#FF7661",
          "#4CD4A5",
          "#FCD34D",
          "#E95252",
        ],
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  const barOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        titleColor: isDark ? "#f1f5f9" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#475569",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
      },
    },
    scales: {
      x: { display: false },
      y: {
        grid: { display: false },
        ticks: { color: isDark ? "#94a3b8" : "#6E6E6E", font: { size: 11 } },
      },
    },
  };

  const ratioChartData = {
    labels: ["Positive", "Neutral", "Negative"],
    datasets: [
      {
        data: [
          stats?.positive || 68,
          stats?.neutral || 18,
          stats?.negative || 14,
        ],
        backgroundColor: ["#4CD4A5", "#FCD34D", "#E95252"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        titleColor: isDark ? "#f1f5f9" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#475569",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
      },
    },
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 transition-colors">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-30 backdrop-blur-sm bg-[#FAF8F5]/80 dark:bg-slate-900/80 border-b border-[#E6E2DD] dark:border-slate-700">
          <h1 className="text-xl font-bold text-[#2C2C2C] dark:text-white">
            History Page
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-[#2C2C2C] dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search analytics..."
                className="pl-10 pr-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-all w-64 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 text-[#2C2C2C] dark:text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 pb-20">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">
                Total History
              </p>
              <h3 className="text-2xl font-bold text-[#2C2C2C] dark:text-white mt-1">
                {stats ? stats.total : 0}
              </h3>
            </div>
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm border-l-4 border-l-[#4CD4A5]">
              <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">
                Positive
              </p>
              <h3 className="text-2xl font-bold text-[#4CD4A5] mt-1">
                {stats ? stats.positive : 0}
              </h3>
            </div>
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm border-l-4 border-l-[#FCD34D]">
              <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">
                Neutral
              </p>
              <h3 className="text-2xl font-bold text-[#FCD34D] mt-1">
                {stats ? stats.neutral : 0}
              </h3>
            </div>
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm border-l-4 border-l-[#E95252]">
              <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">
                Negative
              </p>
              <h3 className="text-2xl font-bold text-[#E95252] mt-1">
                {stats ? stats.negative : 0}
              </h3>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Filter + List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E6E2DD] dark:border-slate-700">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E6E] dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E6E2DD] dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] text-[#2C2C2C] dark:text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${
                      filter === "all"
                        ? "bg-[#4A7DFF] text-white border-[#4A7DFF]"
                        : "bg-white dark:bg-slate-700 border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    <Filter className="w-4 h-4" /> All
                  </button>
                  <button
                    onClick={() => setFilter("positive")}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      filter === "positive"
                        ? "bg-[#4CD4A5] text-white border-[#4CD4A5]"
                        : "bg-white dark:bg-slate-700 border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    Positive
                  </button>
                  <button
                    onClick={() => setFilter("neutral")}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      filter === "neutral"
                        ? "bg-[#FCD34D] text-white border-[#FCD34D]"
                        : "bg-white dark:bg-slate-700 border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    Neutral
                  </button>
                  <button
                    onClick={() => setFilter("negative")}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      filter === "negative"
                        ? "bg-[#E95252] text-white border-[#E95252]"
                        : "bg-white dark:bg-slate-700 border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    Negative
                  </button>
                  <button className="px-3 py-2 rounded-lg border border-[#E6E2DD] dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm font-medium flex items-center gap-2 bg-white dark:bg-slate-700 text-[#6E6E6E] dark:text-slate-300">
                    <Calendar className="w-4 h-4" /> Date
                  </button>
                </div>
              </div>

              {/* Review List */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E6E2DD] dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E6E2DD] dark:border-slate-700 font-bold text-[#2C2C2C] dark:text-white">
                  Recent History
                </div>
                {loading ? (
                  <div className="p-8 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A7DFF]"></div>
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="p-8 text-center text-[#6E6E6E] dark:text-slate-400 text-sm">
                    No reviews found.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E6E2DD] dark:divide-slate-700 custom-scrollbar max-h-[600px] overflow-y-auto">
                    {filteredReviews.map((review) => {
                      const colors = getSentimentColor(review.sentiment);
                      return (
                        <div
                          key={review._id}
                          className="p-4 flex items-start gap-4 hover:bg-[#FAF8F5]/50 dark:hover:bg-slate-700/50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-[#E6E2DD] dark:border-slate-600 flex items-center justify-center text-sm font-bold text-[#6E6E6E] dark:text-slate-300 flex-shrink-0">
                            {review.user
                              ? review.user.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-[#2C2C2C] dark:text-white text-sm">
                                  {review.user || "Anonymous"}
                                </span>
                                <span className="text-xs text-[#6E6E6E] dark:text-slate-400 ml-2">
                                  {new Date(
                                    review.timestamp
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleViewClick(review)}
                                  className="p-1 text-[#4A7DFF] hover:text-[#3A6DE5] transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1 text-[#4CD4A5] hover:text-[#3CB485] transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(review._id)}
                                  className="p-1 text-[#6E6E6E] dark:text-slate-400 hover:text-[#E95252] transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-[#2C2C2C] dark:text-slate-300 mt-1 line-clamp-2">
                              "{review.text}"
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full ${colors.badge} ${colors.text}`}
                              >
                                {review.sentiment}
                              </span>
                              {review.aspects && review.aspects[0] && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4A7DFF]/10 text-[#4A7DFF] border border-[#4A7DFF]/20">
                                  Aspect: {review.aspects[0].aspect}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Charts */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-[#2C2C2C] dark:text-white mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Top Detected Aspects
                </h3>
                <div className="h-64">
                  {topAspectsData ? (
                    <Bar data={topAspectsData} options={barOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#6E6E6E] dark:text-slate-400 text-sm">
                      No aspects detected yet
                    </div>
                  )}
                </div>
              </div>

              {/* Sentiment Ratio */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-[#2C2C2C] dark:text-white mb-4">
                  Sentiment Ratio
                </h3>
                <div className="h-40 relative flex items-center justify-center">
                  <Doughnut data={ratioChartData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-[#2C2C2C] dark:text-white">
                      {Math.round(
                        ((stats?.positive || 0) / (stats?.total || 1)) * 100
                      )}
                      %
                    </span>
                    <span className="text-xs text-[#6E6E6E] dark:text-slate-400">
                      Positive
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-4 px-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[#6E6E6E] dark:text-slate-400">
                      Pos
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-[#6E6E6E] dark:text-slate-400">
                      Neu
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[#6E6E6E] dark:text-slate-400">
                      Neg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            ></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-sm relative z-10 p-6 text-center transform transition-transform scale-100">
              <div className="w-16 h-16 bg-[#E95252]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E95252]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-white mb-2">
                Delete Review?
              </h3>
              <p className="text-sm text-[#6E6E6E] dark:text-slate-400 mb-6">
                This action cannot be undone. The review data will be
                permanently removed from our database.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-[#E95252] text-white font-bold hover:bg-red-600 shadow-lg shadow-[#E95252]/20 transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {showViewModal && selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowViewModal(false)}
            ></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-[#E6E2DD] dark:border-slate-700 p-6 flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-white">
                  Review Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#6E6E6E] dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Sentiment Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${
                        getSentimentColor(selectedReview.sentiment).badge
                      } ${getSentimentColor(selectedReview.sentiment).text}`}
                    >
                      {selectedReview.sentiment}
                    </span>
                  </div>
                  <span className="text-sm text-[#6E6E6E] dark:text-slate-400">
                    {new Date(selectedReview.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Review Text */}
                <div>
                  <h4 className="text-sm font-bold text-[#6E6E6E] dark:text-slate-400 uppercase mb-2">
                    Review Text
                  </h4>
                  <p className="text-[#2C2C2C] dark:text-white bg-[#FAF8F5] dark:bg-slate-700/50 p-4 rounded-xl border border-[#E6E2DD] dark:border-slate-600">
                    {selectedReview.text}
                  </p>
                </div>

                {/* Confidence Score */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <h4 className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                      Aspect Confidence
                    </h4>
                    <span className="text-2xl font-bold text-[#4CD4A5]">
                      {(selectedReview.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-[#FAF8F5] dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4CD4A5] transition-all duration-1000 ease-out"
                      style={{ width: `${selectedReview.confidence * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#6E6E6E] dark:text-slate-400 mt-2">
                    <span>Uncertain</span>
                    <span>Highly Confident</span>
                  </div>
                </div>

                {/* Aspects */}
                {selectedReview.aspects &&
                  selectedReview.aspects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#6E6E6E] dark:text-slate-400 uppercase mb-3">
                        Detected Aspects
                      </h4>
                      <div className="space-y-2">
                        {selectedReview.aspects.map((aspect, idx) => {
                          const colors = getSentimentColor(aspect.sentiment);
                          return (
                            <div
                              key={idx}
                              className={`p-3 border ${colors.bg} ${colors.border} rounded-xl`}
                            >
                              <div className="flex justify-between items-center">
                                <span
                                  className={`text-xs font-bold ${colors.text} uppercase`}
                                >
                                  {aspect.aspect}
                                </span>
                                <span
                                  className={`text-[10px] bg-white dark:bg-slate-800 border ${colors.border} ${colors.text} px-2 py-0.5 rounded-full capitalize`}
                                >
                                  {aspect.sentiment}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        <FeedbackButton />
        <FeedbackModal />
      </div>
    </>
  );
}
