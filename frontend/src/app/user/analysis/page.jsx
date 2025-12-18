"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Bell,
  Sparkles,
  UploadCloud,
  Layers,
  Tag,
  Heart,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// Custom scrollbar styles
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
  
  input[type=range] {
    -webkit-appearance: none; 
    background: transparent; 
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #4A7DFF;
    cursor: pointer;
    margin-top: -8px; 
    box-shadow: 0 2px 6px rgba(74, 125, 255, 0.4);
  }
  input[type=range]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: #E6E2DD;
    border-radius: 2px;
  }
  .dark input[type=range]::-webkit-slider-runnable-track {
    background: #475569;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .toast-slide {
    animation: slideIn 0.3s ease-out;
  }
`;

export default function AnalysisPage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState("single"); // "single" or "bulk"
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Dark mode state
  const [isDark, setIsDark] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

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

  // Animation for confidence bar
  useEffect(() => {
    if (results?.confidence) {
      const timer = setTimeout(() => {
        const bar = document.getElementById("conf-progress-bar");
        if (bar) {
          bar.style.width = `${results.confidence * 100}%`;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [results]);

  const analyzeReview = async () => {
    if (!reviewText.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("http://localhost:8000/analyze-single", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: reviewText.trim(),
          user_id: session?.user?.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to analyze text");
      }

      const data = await response.json();
      console.log("Analysis results:", data);
      setResults(data);

      // Scroll to results
      setTimeout(() => {
        document.getElementById("analysis-results")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message || "An error occurred during analysis");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("product_name", file.name.split(".")[0]);
    formData.append("user_id", session?.user?.email || "anonymous");
    formData.append("save_to_db", "true");

    setBulkLoading(true);
    setError("");
    setBulkResults(null);

    try {
      const response = await fetch("http://localhost:8000/upload-reviews", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      console.log("Bulk analysis results:", data);

      if (data.success) {
        setBulkResults(data.results);
        setTimeout(() => {
          document.getElementById("bulk-results")?.scrollIntoView({
            behavior: "smooth",
          });
        }, 100);
      } else {
        throw new Error(data.error || "Failed to process file");
      }
    } catch (err) {
      console.error("Bulk analysis error:", err);
      setError(err.message || "An error occurred during bulk analysis");
    } finally {
      setBulkLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: {
        bg: "bg-green-50 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
      },
      negative: {
        bg: "bg-red-50 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
      },
      neutral: {
        bg: "bg-yellow-50 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-800",
      },
    };
    return colors[sentiment?.toLowerCase()] || colors.neutral;
  };

  // Emotion mapping based on sentiment
  const getEmotionFromSentiment = (sentiment) => {
    const emotions = {
      positive: {
        name: "JOY / SATISFACTION",
        description:
          "The review expresses satisfaction, happiness, and positive experiences.",
        color: "#4CD4A5",
        intensity: "High Intensity",
      },
      negative: {
        name: "DISAPPOINTMENT / FRUSTRATION",
        description:
          "The review indicates frustration, disappointment, or negative experiences.",
        color: "#E95252",
        intensity: "High Intensity",
      },
      neutral: {
        name: "NEUTRAL / BALANCED",
        description: "The review shows a balanced or neutral emotional state.",
        color: "#FCD34D",
        intensity: "Medium Intensity",
      },
    };
    return emotions[sentiment?.toLowerCase()] || emotions.neutral;
  };

  // Chart data - for Aspect Sentiment Distribution
  const aspectDoughnutData =
    results?.aspects && results.aspects.length > 0
      ? {
          labels: results.aspects.slice(0, 5).map((a) => a.aspect),
          datasets: [
            {
              data: results.aspects.slice(0, 5).map(() => 1),
              backgroundColor: results.aspects
                .slice(0, 5)
                .map((a) =>
                  a.sentiment === "positive"
                    ? "#4CD4A5"
                    : a.sentiment === "negative"
                    ? "#E95252"
                    : "#FCD34D"
                ),
              borderWidth: 0,
            },
          ],
        }
      : null;

  const confidenceBarData =
    results?.aspects && results.aspects.length > 0
      ? {
          labels: results.aspects.map((a) => a.aspect),
          datasets: [
            {
              label: "Confidence",
              data: results.aspects.map((a) => a.confidence * 100),
              backgroundColor: "#4A7DFF",
              borderRadius: 4,
              barThickness: 15,
            },
          ],
        }
      : null;

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "85%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 10,
          font: { size: 10 },
          color: isDark ? "#cbd5e1" : "#475569",
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        titleColor: isDark ? "#f1f5f9" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#475569",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
      },
    },
  };

  const barOptions = {
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
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: isDark ? "#334155" : "#E6E2DD" },
        ticks: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? "#94a3b8" : "#6E6E6E",
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 transition-colors">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 backdrop-blur-sm bg-[#FAF8F5]/80 dark:bg-slate-900/80 border-b border-[#E6E2DD] dark:border-slate-700">
          <h1 className="text-lg md:text-xl font-bold text-[#2C2C2C] dark:text-white">
            Analysis Page
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden lg:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-[#2C2C2C] dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search analytics..."
                className="pl-10 pr-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all w-64 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 text-[#2C2C2C] dark:text-white placeholder:text-gray-400"
              />
            </div>
            <button className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 relative">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-[#6E6E6E] dark:text-slate-400" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 bg-[#E95252]"></span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6 pb-20 min-h-[calc(100vh-64px)]">
          <div className="space-y-6">
            {/* Toggle & Input Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
              {/* Toggle Switch */}
              <div className="flex justify-center mb-4 md:mb-6">
                <div className="bg-[#FAF8F5] dark:bg-slate-700 p-1 rounded-xl flex border border-[#E6E2DD] dark:border-slate-600">
                  <button
                    onClick={() => setMode("single")}
                    className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                      mode === "single"
                        ? "bg-white dark:bg-slate-600 text-blue-500 shadow-sm"
                        : "text-[#6E6E6E] dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                    }`}
                  >
                    Single Review
                  </button>
                  <button
                    onClick={() => setMode("bulk")}
                    className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                      mode === "bulk"
                        ? "bg-white dark:bg-slate-600 text-blue-500 shadow-sm"
                        : "text-[#6E6E6E] dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                    }`}
                  >
                    Bulk Reviews
                  </button>
                </div>
              </div>

              {/* Single Input */}
              {mode === "single" && (
                <div className="space-y-4">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full h-32 p-3 md:p-4 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-[#FAF8F5] dark:bg-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none text-sm md:text-base text-[#2C2C2C] dark:text-white placeholder:text-[#6E6E6E]/50 dark:placeholder:text-slate-400"
                    placeholder="Paste a customer review here to analyze sentiment, aspects, and emotions..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={analyzeReview}
                      disabled={loading || !reviewText.trim()}
                      className="w-full sm:w-auto px-4 md:px-6 py-2 bg-blue-500 text-white rounded-lg font-bold text-xs md:text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      {loading ? "Analyzing..." : "Analyze Text"}
                    </button>
                  </div>
                  {error && mode === "single" && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Input */}
              {mode === "bulk" && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#E6E2DD] dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#FAF8F5]/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="font-bold text-[#2C2C2C] dark:text-white">
                      Click or Drop Files Here
                    </p>
                    <p className="text-xs text-[#6E6E6E] dark:text-slate-400 mt-1">
                      Supports CSV, Excel, or JSON formats
                    </p>
                  </div>
                  {bulkLoading && (
                    <div className="mt-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                        Processing bulk reviews...
                      </p>
                    </div>
                  )}
                  {error && mode === "bulk" && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Single Analysis Results */}
            {results && mode === "single" && (
              <div id="analysis-results" className="space-y-6 animate-fade-in">
                {/* Top Row: Overall Sentiment & Confidence */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Overall Sentiment Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-6 relative overflow-hidden">
                    <div
                      className="absolute right-0 top-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4"
                      style={{
                        backgroundColor:
                          results.sentiment?.toLowerCase() === "positive"
                            ? "#4CD4A520"
                            : results.sentiment?.toLowerCase() === "negative"
                            ? "#E9525220"
                            : "#FCD34D20",
                      }}
                    ></div>
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor:
                          results.sentiment?.toLowerCase() === "positive"
                            ? "#4CD4A530"
                            : results.sentiment?.toLowerCase() === "negative"
                            ? "#E9525230"
                            : "#FCD34D30",
                      }}
                    >
                      <svg
                        className="w-8 h-8"
                        fill={
                          results.sentiment?.toLowerCase() === "positive"
                            ? "#4CD4A5"
                            : results.sentiment?.toLowerCase() === "negative"
                            ? "#E95252"
                            : "#FCD34D"
                        }
                        viewBox="0 0 24 24"
                      >
                        {results.sentiment?.toLowerCase() === "positive" ? (
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                        ) : results.sentiment?.toLowerCase() === "negative" ? (
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zM12 14c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5z" />
                        ) : (
                          <path d="M9 14h6v1.5H9z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase tracking-wide">
                        Overall Sentiment
                      </h3>
                      <div className="text-3xl font-bold text-[#2C2C2C] dark:text-white mt-1 capitalize">
                        {results.sentiment}
                      </div>
                      <p
                        className="text-xs font-medium mt-1"
                        style={{
                          color:
                            results.sentiment?.toLowerCase() === "positive"
                              ? "#4CD4A5"
                              : results.sentiment?.toLowerCase() === "negative"
                              ? "#E95252"
                              : "#FCD34D",
                        }}
                      >
                        Strong Signal Detected
                      </p>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                        Confidence Score
                      </h3>
                      <span
                        className={`text-2xl font-bold ${
                          results.confidence >= 0.5
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {(results.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-[#FAF8F5] dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        id="conf-progress-bar"
                        className={`h-full transition-all duration-1000 ease-out ${
                          results.confidence >= 0.5
                            ? "bg-green-600"
                            : "bg-red-600"
                        }`}
                        style={{ width: "0%" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#6E6E6E] dark:text-slate-400 mt-2">
                      <span>Low Confidence</span>
                      <span>High Confidence</span>
                    </div>
                  </div>
                </div>

                {/* Middle Row: Aspect & Emotion Detection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Aspect Detection */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-[#2C2C2C] dark:text-white mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-blue-500" />
                      Aspect Detection
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {results.aspects && results.aspects.length > 0 ? (
                        results.aspects.map((aspect, idx) => {
                          const colors = getSentimentColor(aspect.sentiment);
                          return (
                            <div
                              key={idx}
                              className={`p-3 border ${colors.bg} ${colors.border} rounded-xl transition-all hover:shadow-sm`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span
                                  className={`text-xs font-bold ${colors.text} uppercase tracking-wide`}
                                >
                                  {aspect.aspect}
                                </span>
                                <span
                                  className={`text-[10px] bg-white dark:bg-slate-800 border ${colors.border} ${colors.text} px-2 py-0.5 rounded-full capitalize font-medium`}
                                >
                                  {aspect.sentiment}
                                </span>
                              </div>
                              <p className="text-sm text-[#2C2C2C] dark:text-slate-300">
                                "...{aspect.text_span}..."
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                          <p className="text-sm">
                            No aspects detected in this review.
                          </p>
                          <p className="text-xs mt-1">
                            Try analyzing a more detailed review.
                          </p>
                        </div>
                      )}
                    </div>
                    {results.total_aspects_found > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-600">
                        <p className="text-xs text-gray-600 dark:text-slate-400 text-center">
                          Found{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {results.total_aspects_found}
                          </span>{" "}
                          total aspects
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Emotion Detection */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-[#2C2C2C] dark:text-white mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-[#FF7661]" />
                      Emotion Detection
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const emotion = getEmotionFromSentiment(
                          results.sentiment
                        );
                        const emotionColor =
                          results.sentiment === "positive"
                            ? "#4CD4A5"
                            : results.sentiment === "negative"
                            ? "#E95252"
                            : "#FCD34D";

                        return (
                          <div
                            className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                            style={{
                              borderColor: `${emotionColor}40`,
                              backgroundColor: `${emotionColor}08`,
                            }}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span
                                className="text-xs font-bold uppercase tracking-wide"
                                style={{ color: emotionColor }}
                              >
                                {emotion.name}
                              </span>
                              <span
                                className="text-[10px] bg-white dark:bg-slate-800 border px-2 py-1 rounded-full font-medium"
                                style={{
                                  borderColor: emotionColor,
                                  color: emotionColor,
                                }}
                              >
                                {emotion.intensity}
                              </span>
                            </div>
                            <p className="text-sm text-[#2C2C2C] dark:text-slate-300 mb-3">
                              "...
                              {results.aspects?.[0]?.text_span ||
                                "absolutely love the interface"}
                              ..."
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Charts */}
                {aspectDoughnutData && confidenceBarData && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Aspect Ratio Doughnut */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                      <h3 className="font-bold text-sm text-[#2C2C2C] dark:text-white mb-4">
                        Aspect Sentiment Ratio
                      </h3>
                      <div className="h-40 relative">
                        <Doughnut
                          data={aspectDoughnutData}
                          options={doughnutOptions}
                        />
                      </div>
                    </div>

                    {/* Confidence Bar Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex flex-col">
                      <h3 className="font-bold text-sm text-[#2C2C2C] dark:text-white mb-4">
                        Confidence by Aspect
                      </h3>
                      <div className="flex-1 h-40">
                        <Bar data={confidenceBarData} options={barOptions} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Analysis Results */}
            {/* Bulk Analysis Results */}
            {bulkResults && mode === "bulk" && (
              <div id="bulk-results" className="space-y-6 animate-fade-in">
                {/* Summary Header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                  <h2 className="text-2xl font-bold text-[#2C2C2C] dark:text-white mb-4">
                    Bulk Analysis Results for "{bulkResults.product_name}"
                  </h2>

                  {/* Overall Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                        Total Reviews
                      </div>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                        {bulkResults.individual_results?.length ||
                          bulkResults.total_reviews ||
                          0}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                      <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                        Positive
                      </div>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                        {bulkResults.overall_percentage?.positive || 0}%
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                      <div className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                        Neutral
                      </div>
                      <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                        {bulkResults.overall_percentage?.neutral || 0}%
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="text-sm text-red-600 dark:text-red-400 font-semibold">
                        Negative
                      </div>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                        {bulkResults.overall_percentage?.negative || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Reviews - SAME LAYOUT AS SINGLE REVIEW */}
                {bulkResults.individual_results &&
                  bulkResults.individual_results.map((review, reviewIdx) => (
                    <div key={reviewIdx} className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-[#E6E2DD] dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">
                          Review #{reviewIdx + 1}
                        </h3>

                        {/* Review Text Display */}
                        <div className="mb-4 p-3 bg-[#FAF8F5] dark:bg-slate-700 rounded-lg">
                          <p className="text-sm text-[#2C2C2C] dark:text-slate-300 leading-relaxed">
                            "{review.text}"
                          </p>
                        </div>
                      </div>

                      {/* Top Row: Overall Sentiment & Confidence - EXACT SAME AS SINGLE */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Overall Sentiment Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-6 relative overflow-hidden">
                          <div
                            className="absolute right-0 top-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4"
                            style={{
                              backgroundColor:
                                review.overall_sentiment?.toLowerCase() ===
                                "positive"
                                  ? "#4CD4A520"
                                  : review.overall_sentiment?.toLowerCase() ===
                                    "negative"
                                  ? "#E9525220"
                                  : "#FCD34D20",
                            }}
                          ></div>
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor:
                                review.overall_sentiment?.toLowerCase() ===
                                "positive"
                                  ? "#4CD4A530"
                                  : review.overall_sentiment?.toLowerCase() ===
                                    "negative"
                                  ? "#E9525230"
                                  : "#FCD34D30",
                            }}
                          >
                            <svg
                              className="w-8 h-8"
                              fill={
                                review.overall_sentiment?.toLowerCase() ===
                                "positive"
                                  ? "#4CD4A5"
                                  : review.overall_sentiment?.toLowerCase() ===
                                    "negative"
                                  ? "#E95252"
                                  : "#FCD34D"
                              }
                              viewBox="0 0 24 24"
                            >
                              {review.overall_sentiment?.toLowerCase() ===
                              "positive" ? (
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                              ) : review.overall_sentiment?.toLowerCase() ===
                                "negative" ? (
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zM12 14c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5z" />
                              ) : (
                                <path d="M9 14h6v1.5H9z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                              )}
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase tracking-wide">
                              Overall Sentiment
                            </h3>
                            <div className="text-3xl font-bold text-[#2C2C2C] dark:text-white mt-1 capitalize">
                              {review.overall_sentiment}
                            </div>
                            <p
                              className="text-xs font-medium mt-1"
                              style={{
                                color:
                                  review.overall_sentiment?.toLowerCase() ===
                                  "positive"
                                    ? "#4CD4A5"
                                    : review.overall_sentiment?.toLowerCase() ===
                                      "negative"
                                    ? "#E95252"
                                    : "#FCD34D",
                              }}
                            >
                              Strong Signal Detected
                            </p>
                          </div>
                        </div>

                        {/* Confidence Meter */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex flex-col justify-center">
                          <div className="flex justify-between items-end mb-2">
                            <h3 className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                              Confidence Score
                            </h3>
                            <span
                              className={`text-2xl font-bold ${
                                review.overall_confidence >= 0.5
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {(review.overall_confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-4 bg-[#FAF8F5] dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ease-out ${
                                review.overall_confidence >= 0.5
                                  ? "bg-green-600"
                                  : "bg-red-600"
                              }`}
                              style={{
                                width: `${review.overall_confidence * 100}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-[#6E6E6E] dark:text-slate-400 mt-2">
                            <span>Low Confidence</span>
                            <span>High Confidence</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Aspect & Emotion Detection - EXACT SAME AS SINGLE */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Aspect Detection */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                          <h3 className="font-bold text-lg text-[#2C2C2C] dark:text-white mb-4 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-blue-500" />
                            Aspect Detection
                          </h3>
                          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {review.aspects && review.aspects.length > 0 ? (
                              review.aspects.map((aspect, idx) => {
                                const colors = getSentimentColor(
                                  aspect.sentiment
                                );
                                return (
                                  <div
                                    key={idx}
                                    className={`p-3 border ${colors.bg} ${colors.border} rounded-xl transition-all hover:shadow-sm`}
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span
                                        className={`text-xs font-bold ${colors.text} uppercase tracking-wide`}
                                      >
                                        {aspect.aspect}
                                      </span>
                                      <span
                                        className={`text-[10px] bg-white dark:bg-slate-800 border ${colors.border} ${colors.text} px-2 py-0.5 rounded-full capitalize font-medium`}
                                      >
                                        {aspect.sentiment}
                                      </span>
                                    </div>
                                    <p className="text-sm text-[#2C2C2C] dark:text-slate-300">
                                      "...{aspect.text_span}..."
                                    </p>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                <p className="text-sm">
                                  No aspects detected in this review.
                                </p>
                              </div>
                            )}
                          </div>
                          {review.total_aspects_found > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-600">
                              <p className="text-xs text-gray-600 dark:text-slate-400 text-center">
                                Found{" "}
                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                  {review.total_aspects_found}
                                </span>{" "}
                                total aspects
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Emotion Detection */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-[#E6E2DD] dark:border-slate-700 shadow-sm">
                          <h3 className="font-bold text-lg text-[#2C2C2C] dark:text-white mb-4 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-[#FF7661]" />
                            Emotion Detection
                          </h3>
                          <div className="space-y-3">
                            {(() => {
                              const emotion = getEmotionFromSentiment(
                                review.overall_sentiment
                              );
                              const emotionColor =
                                review.overall_sentiment === "positive"
                                  ? "#4CD4A5"
                                  : review.overall_sentiment === "negative"
                                  ? "#E95252"
                                  : "#FCD34D";

                              return (
                                <div
                                  className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                                  style={{
                                    borderColor: `${emotionColor}40`,
                                    backgroundColor: `${emotionColor}08`,
                                  }}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span
                                      className="text-xs font-bold uppercase tracking-wide"
                                      style={{ color: emotionColor }}
                                    >
                                      {emotion.name}
                                    </span>
                                    <span
                                      className="text-[10px] bg-white dark:bg-slate-800 border px-2 py-1 rounded-full font-medium"
                                      style={{
                                        borderColor: emotionColor,
                                        color: emotionColor,
                                      }}
                                    >
                                      {emotion.intensity}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#2C2C2C] dark:text-slate-300 mb-3">
                                    "...
                                    {review.aspects?.[0]?.text_span ||
                                      review.text.substring(0, 50)}
                                    ..."
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Divider between reviews (except for last one) */}
                      {reviewIdx <
                        bulkResults.individual_results.length - 1 && (
                        <div className="border-t-2 border-dashed border-gray-200 dark:border-slate-700 my-8"></div>
                      )}
                    </div>
                  ))}

                {/* No Results Message */}
                {(!bulkResults.individual_results ||
                  bulkResults.individual_results.length === 0) && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-[#E6E2DD] dark:border-slate-700 shadow-sm text-center">
                    <p className="text-gray-500 dark:text-slate-400 text-lg">
                      No individual review results available.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">
                      The analysis may not have generated individual results.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
