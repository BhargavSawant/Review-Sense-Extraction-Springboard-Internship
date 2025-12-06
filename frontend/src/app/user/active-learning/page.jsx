"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Send, Loader, CheckCircle, TrendingUp, AlertCircle, Plus, 
  X, Save, Brain, Search, MousePointerClick, ArrowRight, Check 
} from "lucide-react";

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

// Custom Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <X className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />
  };

  const colors = {
    success: "bg-green-500 dark:bg-green-600",
    error: "bg-red-500 dark:bg-red-600",
    info: "bg-blue-500 dark:bg-blue-600"
  };

  return (
    <div className={`fixed top-20 right-6 z-50 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 toast-slide max-w-md`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm font-medium">{message}</p>
      <button 
        onClick={onClose}
        className="ml-auto hover:bg-white/20 rounded-lg p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function ActiveLearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Dark mode state
  const [isDark, setIsDark] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  // State Management
  const [stats, setStats] = useState({
    sentToAdmin: 0,
    inProgress: 0,
    completed: 0,
    drafts: 0
  });
  const [lowConfidenceQueue, setLowConfidenceQueue] = useState([]);
  const [historyReviews, setHistoryReviews] = useState([]);
  const [sentForTraining, setSentForTraining] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal States
  const [showAddHistoryModal, setShowAddHistoryModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  
  // Correction Form State
  const [correctedSentiment, setCorrectedSentiment] = useState("");
  const [confidenceOverride, setConfidenceOverride] = useState(85);
  const [aspects, setAspects] = useState([]);
  const [newAspect, setNewAspect] = useState("");

  // Detect system theme
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
      document.documentElement.classList.toggle('dark', isDarkMode);
    };

    checkTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => mediaQuery.removeEventListener('change', checkTheme);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      await fetchHistoryReviews();
      await fetchLowConfidenceQueue();
      await fetchSentForTraining();
      await fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowConfidenceQueue = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/reviews?user_email=${session.user.email}&limit=200`
      );
      if (!res.ok) throw new Error("Failed to fetch low confidence reviews");
      const data = await res.json();
      const lowConfReviews = (data.reviews || []).filter(
        (r) => (r.confidence || 0) <= 0.5
      );
      setLowConfidenceQueue(lowConfReviews);
    } catch (err) {
      console.error("Queue fetch error:", err);
    }
  };

  const fetchHistoryReviews = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/reviews?user_email=${session.user.email}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistoryReviews(data.reviews || []);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const fetchSentForTraining = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/corrections?user_email=${session.user.email}`
      );
      if (!res.ok) throw new Error("Failed to fetch corrections");
      const data = await res.json();
      const relevantCorrections = (data.corrections || []).filter(
        (c) => ["pending_admin_review", "approved", "rejected"].includes(c.status)
      );
      const enriched = relevantCorrections.map((c) => ({
        ...c,
        review_text:
          historyReviews.find((r) => r._id === c.review_id)?.text ||
          "Review text unavailable",
      }));
      setSentForTraining(enriched);
    } catch (err) {
      console.error("Corrections fetch error:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/user-training-stats?user_email=${session.user.email}`
      );
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const handleSelectReview = (review) => {
    setSelectedReview(review);
    setCorrectedSentiment(review.sentiment);
    setConfidenceOverride(Math.round((review.confidence || 0.5) * 100));
    setAspects(review.aspects?.map(a => a.aspect) || []);
    setNewAspect("");
  };

  const handleCloseEditor = () => {
    setSelectedReview(null);
    setCorrectedSentiment("");
    setConfidenceOverride(85);
    setAspects([]);
    setNewAspect("");
  };

  const handleSaveDraft = async () => {
    if (!selectedReview) return;
    
    try {
      const payload = {
        review_id: selectedReview._id,
        user_email: session.user.email,
        original_sentiment: selectedReview.sentiment,
        corrected_sentiment: correctedSentiment,
        confidence_override: confidenceOverride / 100,
        aspects: aspects,
        status: "draft"
      };
      
      const res = await fetch("http://localhost:8000/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save draft");
      
      showToast("Draft saved successfully!", "success");
    } catch (err) {
      showToast("Error saving draft: " + err.message, "error");
    }
  };

  const handleSendToAdmin = async () => {
    if (!selectedReview) return;
    
    try {
      const payload = {
        review_id: selectedReview._id,
        user_email: session.user.email,
        original_sentiment: selectedReview.sentiment,
        corrected_sentiment: correctedSentiment,
        confidence_override: confidenceOverride / 100,
        aspects: aspects,
        status: "pending_admin_review"
      };
      
      const res = await fetch("http://localhost:8000/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to send to admin");
      
      showToast("Review sent to admin for verification!", "success");
      
      // Remove from queue and refresh
      setLowConfidenceQueue(prev => prev.filter(r => r._id !== selectedReview._id));
      handleCloseEditor();
      fetchStats();
      fetchSentForTraining();
    } catch (err) {
      showToast("Error sending to admin: " + err.message, "error");
    }
  };

  const handleAddAspect = () => {
    if (newAspect.trim() && !aspects.includes(newAspect.trim())) {
      setAspects([...aspects, newAspect.trim()]);
      setNewAspect("");
    }
  };

  const handleRemoveAspect = (aspect) => {
    setAspects(aspects.filter(a => a !== aspect));
  };

  const handleOpenAddHistoryModal = () => {
    setShowAddHistoryModal(true);
    setSelectedHistoryIds([]);
  };

  const handleToggleHistorySelection = (id) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handleConfirmAddHistory = () => {
    const selectedReviews = historyReviews.filter(r => 
      selectedHistoryIds.includes(r._id)
    );
    
    // Add to the BEGINNING of the queue (not the end)
    setLowConfidenceQueue(prev => {
      const existingIds = new Set(prev.map(r => r._id));
      const newReviews = selectedReviews.filter(r => !existingIds.has(r._id));
      return [...newReviews, ...prev]; // New reviews first
    });
    
    setShowAddHistoryModal(false);
    setSelectedHistoryIds([]);
    showToast(`Added ${selectedReviews.length} review(s) to queue`, "success");
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" };
      case "negative": return { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" };
      case "neutral": return { bg: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" };
      default: return { bg: "bg-gray-50 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-400", dot: "bg-gray-500" };
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 transition-colors">
        {/* Toast Notifications */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-30 backdrop-blur-sm bg-[#FAF8F5]/80 dark:bg-slate-900/80 border-b border-[#E6E2DD] dark:border-slate-700">
          <h1 className="text-xl font-bold text-[#2C2C2C] dark:text-white">Active Learning</h1>
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
        <div className="p-6 pb-20 space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sent to Admin */}
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FF7661]/10 dark:bg-[#FF7661]/20 text-[#FF7661] flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">Sent to Admin</p>
                <h3 className="text-2xl font-bold text-[#2C2C2C] dark:text-white mt-1">{stats.sentToAdmin}</h3>
              </div>
            </div>

            {/* Training in Progress - Clickable */}
            <div
              onClick={() => setShowTrainingModal(true)}
              className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-4 cursor-pointer hover:border-[#4A7DFF] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#4A7DFF]/10 dark:bg-[#4A7DFF]/20 text-[#4A7DFF] flex items-center justify-center flex-shrink-0">
                <Loader className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase group-hover:text-[#4A7DFF] transition-colors">
                  Admin Review
                </p>
                <h3 className="text-2xl font-bold text-[#2C2C2C] dark:text-white mt-1">
                  {sentForTraining.length}
                </h3>
              </div>
            </div>

            {/* Completed */}
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#4CD4A5]/10 dark:bg-[#4CD4A5]/20 text-[#4CD4A5] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">Completed</p>
                <h3 className="text-2xl font-bold text-[#2C2C2C] dark:text-white mt-1">{stats.completed}</h3>
              </div>
            </div>

            {/* Accuracy Gain (Placeholder) */}
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#4CD4A5]/10 dark:bg-[#4CD4A5]/20 text-[#4CD4A5] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase">Your Contributions</p>
                <h3 className="text-2xl font-bold text-[#4CD4A5] mt-1">{stats.sentToAdmin + stats.completed}</h3>
              </div>
            </div>
          </div>

          {/* Main Workspace: Split Screen */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Left Column: Low Confidence Queue */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-[#E6E2DD] dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#E6E2DD] dark:border-slate-700 bg-[#FAF8F5]/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-[#2C2C2C] dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#E95252]" />
                  Low Confidence Queue
                </h3>
                <button
                  onClick={handleOpenAddHistoryModal}
                  className="text-xs font-bold text-[#4A7DFF] hover:bg-[#4A7DFF]/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add from History
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="p-8 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A7DFF]"></div>
                  </div>
                ) : lowConfidenceQueue.length === 0 ? (
                  <div className="p-8 text-center text-[#6E6E6E] dark:text-slate-400 text-sm">
                    All caught up! No low confidence reviews.
                  </div>
                ) : (
                  lowConfidenceQueue.map((review) => {
                    const colors = getSentimentColor(review.sentiment);
                    const isSelected = selectedReview?._id === review._id;
                    return (
                      <div
                        key={review._id}
                        onClick={() => handleSelectReview(review)}
                        className={`p-3 bg-white dark:bg-slate-700 rounded-xl border cursor-pointer transition-all group shadow-sm hover:shadow-md ${
                          isSelected ? "border-[#4A7DFF] ring-2 ring-[#4A7DFF]/20" : "border-[#E6E2DD] dark:border-slate-600 hover:border-[#4A7DFF]"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-[#6E6E6E] dark:text-slate-400">
                            #{review._id?.slice(-4)}
                          </span>
                          <span className="text-[10px] font-bold text-[#E95252] bg-[#E95252]/10 px-2 py-0.5 rounded-full">
                            {Math.round((review.confidence || 0) * 100)}% Conf.
                          </span>
                        </div>
                        <p className="text-xs text-[#2C2C2C] dark:text-slate-300 line-clamp-2 mb-2 font-medium">
                          "{review.text}"
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
                          <span className="text-[10px] text-[#6E6E6E] dark:text-slate-400">
                            Predicted: {review.sentiment}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Correction Studio */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-[#E6E2DD] dark:border-slate-700 shadow-sm p-6 relative flex flex-col">
              {!selectedReview ? (
                /* Placeholder State */
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-20 h-20 bg-[#FAF8F5] dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <MousePointerClick className="w-10 h-10 text-[#6E6E6E] dark:text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-white">Select a Review</h3>
                  <p className="text-sm text-[#6E6E6E] dark:text-slate-400 max-w-xs mt-2">
                    Choose a low-confidence review from the queue to verify sentiment and send to admin for training.
                  </p>
                </div>
              ) : (
                /* Active Editor State */
                <div className="flex flex-col h-full fade-in">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-white">Review Analysis</h2>
                      <p className="text-xs text-[#6E6E6E] dark:text-slate-400">
                        ID: <span className="font-mono">#{selectedReview._id?.slice(-8)}</span> • Detected Confidence:{" "}
                        <span className="text-[#E95252] font-bold">
                          {Math.round((selectedReview.confidence || 0) * 100)}%
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={handleCloseEditor}
                      className="p-2 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 rounded-full text-[#6E6E6E] dark:text-slate-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Review Content */}
                  <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-xl p-4 border border-[#E6E2DD] dark:border-slate-700 mb-6 flex-shrink-0">
                    <p className="text-sm text-[#2C2C2C] dark:text-slate-300 italic leading-relaxed">
                      "{selectedReview.text}"
                    </p>
                  </div>

                  {/* Scrollable Controls */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {/* Sentiment Label */}
                    <div>
                      <label className="text-xs font-bold text-[#6E6E6E] dark:text-slate-400 uppercase block mb-2">
                        Sentiment Label
                      </label>
                      <select
                        value={correctedSentiment}
                        onChange={(e) => setCorrectedSentiment(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] focus:border-transparent font-medium text-[#2C2C2C] dark:text-white"
                      >
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                      </select>
                    </div>

                    {/* Confidence Override Slider */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-bold text-[#6E6E6E] dark:text-slate-400 uppercase">
                          Confidence Override
                        </label>
                        <span className="text-lg font-bold text-[#4A7DFF]">
                          {confidenceOverride}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={confidenceOverride}
                        onChange={(e) => setConfidenceOverride(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-[#6E6E6E] dark:text-slate-400 mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    {/* Aspects Detected */}
                    <div>
                      <label className="text-xs font-bold text-[#6E6E6E] dark:text-slate-400 uppercase block mb-2">
                        Aspects Detected
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {aspects.map((aspect, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E2DD] dark:border-slate-600 text-[#2C2C2C] dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                          >
                            {aspect}
                            <button
                              onClick={() => handleRemoveAspect(aspect)}
                              className="hover:text-[#E95252]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={newAspect}
                            onChange={(e) => setNewAspect(e.target.value)}
                            placeholder="Add new aspect"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newAspect.trim()) {
                                handleAddAspect();
                              }
                            }}
                            className="px-3 py-1 rounded-full border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] focus:border-transparent placeholder-[#6E6E6E] dark:placeholder-slate-400 min-w-[120px]"
                          />
                          <button
                            onClick={handleAddAspect}
                            className="px-2 py-1 rounded-full bg-[#4A7DFF]/10 text-[#4A7DFF] hover:bg-[#4A7DFF]/20 transition-colors flex items-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-6 mt-4 border-t border-[#E6E2DD] dark:border-slate-700 flex justify-end gap-3">
                    <button
                      onClick={handleSaveDraft}
                      className="px-5 py-2.5 rounded-xl border border-[#E6E2DD] dark:border-slate-600 text-[#6E6E6E] dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                      <Save className="w-4 h-4" /> Save Draft
                    </button>
                    <button
                      onClick={handleSendToAdmin}
                      className="px-5 py-2.5 rounded-xl bg-[#4A7DFF] text-white font-bold hover:bg-blue-600 shadow-lg shadow-[#4A7DFF]/20 flex items-center gap-2 transition-colors"
                    >
                      <Brain className="w-4 h-4" /> Send to Admin
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add from History Modal */}
        {showAddHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddHistoryModal(false)}
            />
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-lg relative z-10 transform scale-100 transition-transform">
              <div className="p-6 border-b border-[#E6E2DD] dark:border-slate-700 flex justify-between items-center bg-[#FAF8F5]/50 dark:bg-slate-900/50 rounded-t-2xl">
                <div>
                  <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-white">Add Reviews from History</h3>
                  <p className="text-xs text-[#6E6E6E] dark:text-slate-400">Select recent reviews to add to queue</p>
                </div>
                <button
                  onClick={() => setShowAddHistoryModal(false)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-[#6E6E6E] dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-0 overflow-y-auto max-h-[300px] custom-scrollbar">
                {historyReviews.length === 0 ? (
                  <div className="p-6 text-center text-[#6E6E6E] dark:text-slate-400 text-xs">
                    No reviews available in history.
                  </div>
                ) : (
                  historyReviews.map((review) => {
                    const isInQueue = lowConfidenceQueue.some(r => r._id === review._id);
                    if (isInQueue) return null;
                    
                    return (
                      <div
                        key={review._id}
                        className="p-3 border-b border-[#E6E2DD] dark:border-slate-700 last:border-0 hover:bg-[#FAF8F5] dark:hover:bg-slate-700/50 transition-colors flex items-start gap-3"
                      >
                        <input
                          type="checkbox"
                          id={`hist-${review._id}`}
                          checked={selectedHistoryIds.includes(review._id)}
                          onChange={() => handleToggleHistorySelection(review._id)}
                          className="mt-1 w-4 h-4 rounded border-[#E6E2DD] dark:border-slate-600 text-[#4A7DFF] focus:ring-[#4A7DFF]"
                        />
                        <label htmlFor={`hist-${review._id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#2C2C2C] dark:text-white text-sm">
                              #{review._id?.slice(-4)}
                            </span>
                            <span className="text-xs text-[#6E6E6E] dark:text-slate-400">
                              {Math.round((review.confidence || 0) * 100)}% Conf
                            </span>
                          </div>
                          <p className="text-xs text-[#6E6E6E] dark:text-slate-400 line-clamp-1 mt-0.5">
                            "{review.text}"
                          </p>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-[#E6E2DD] dark:border-slate-700 bg-[#FAF8F5]/30 dark:bg-slate-900/30 rounded-b-2xl flex justify-end gap-2">
                <button
                  onClick={() => setShowAddHistoryModal(false)}
                  className="px-4 py-2 border border-[#E6E2DD] dark:border-slate-600 rounded-lg text-sm font-bold text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddHistory}
                  disabled={selectedHistoryIds.length === 0}
                  className="px-4 py-2 bg-[#4A7DFF] text-white rounded-lg text-sm font-bold hover:bg-blue-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Selected ({selectedHistoryIds.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Training Details Modal */}
        {showTrainingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowTrainingModal(false)}
            />
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-2xl relative z-10 transform scale-100 transition-transform">
              <div className="p-6 border-b border-[#E6E2DD] dark:border-slate-700 flex justify-between items-center bg-[#FAF8F5]/50 dark:bg-slate-900/50 rounded-t-2xl">
                <div>
                  <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-white">Reviews Sent to Admin</h3>
                  <p className="text-xs text-[#6E6E6E] dark:text-slate-400">
                    Status: <span className="text-[#4A7DFF] font-bold">Pending Verification</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowTrainingModal(false)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-[#6E6E6E] dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-[#FAF8F5]/50 dark:bg-slate-900/50 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                {sentForTraining.length === 0 ? (
                  <div className="p-8 text-center text-[#6E6E6E] dark:text-slate-400">
                    No reviews sent for training yet.
                  </div>
                ) : (
                  sentForTraining.map((item, idx) => {
                    const statusColors = {
                      pending_admin_review: { bg: "bg-[#4A7DFF]/10", text: "text-[#4A7DFF]", label: "Pending Review" },
                      approved: { bg: "bg-[#4CD4A5]/10", text: "text-[#4CD4A5]", label: "Approved" },
                      rejected: { bg: "bg-[#E95252]/10", text: "text-[#E95252]", label: "Rejected" }
                    };
                    const status = statusColors[item.status] || statusColors.pending_admin_review;

                    return (
                      <div key={idx} className="bg-white dark:bg-slate-700 p-4 rounded-xl border border-[#E6E2DD] dark:border-slate-600 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-[#6E6E6E] dark:text-slate-400">
                            #{item.review_id?.slice(-8) || item._id?.slice(-8)}
                          </span>
                          <span className={`text-[10px] ${status.bg} ${status.text} px-2 py-0.5 rounded-full font-bold`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-[#2C2C2C] dark:text-slate-300 italic mb-3">
                          "{item.review_text}"
                        </p>
                        <div className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-[#E6E2DD]/50 dark:border-slate-600/50">
                          <div className="flex items-center gap-1 text-[#6E6E6E] dark:text-slate-400">
                            <span className="line-through">
                              {item.original_sentiment}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-[#6E6E6E] dark:text-slate-400" />
                          <div className="flex items-center gap-1 font-bold text-[#4A7DFF]">
                            {item.corrected_sentiment}
                          </div>
                          <div className="ml-auto text-[#6E6E6E] dark:text-slate-400">
                            Conf: {Math.round((item.confidence_override || item.confidence || 0.5) * 100)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-[#E6E2DD] dark:border-slate-700 bg-[#FAF8F5]/30 dark:bg-slate-900/30 rounded-b-2xl flex justify-end">
                <button
                  onClick={() => setShowTrainingModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-[#E6E2DD] dark:border-slate-600 rounded-lg text-sm font-bold text-[#6E6E6E] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}