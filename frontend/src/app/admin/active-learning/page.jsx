// frontend/src/app/admin/active-learning/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle,
  Brain,
  UserCheck,
  Bot,
  X,
  Trash2,
  Plus,
  Shield,
  RefreshCw,
  Play,
} from "lucide-react";
import dynamic from "next/dynamic";

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });
import "react-datepicker/dist/react-datepicker.css";

export default function AdminActiveLearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State Management
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [trainingQueue, setTrainingQueue] = useState([]);
  const [stats, setStats] = useState({
    currentAccuracy: 94,
    modelVersion: "v2.4.1",
    accuracyChange: 2.4,
    readyToTrain: 0,
    pendingCount: 0,
  });
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState(null);

  // Modal States
  const [approvedSentiment, setApprovedSentiment] = useState("neutral");
  const [calibratedConfidence, setCalibratedConfidence] = useState(87);
  const [refinedAspects, setRefinedAspects] = useState([]);
  const [newAspect, setNewAspect] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.email === "admin@sentimentplus.com") {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPendingCorrections(),
        fetchTrainingQueue(),
        fetchAdminStats(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCorrections = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/corrections?status=pending_admin_review&limit=50");
      if (!res.ok) {
        console.error("Fetch failed:", await res.text());
        throw new Error("Failed to fetch pending corrections");
      }
      const data = await res.json();
      setPendingCorrections(data.corrections || []);
      setStats(prev => ({ ...prev, pendingCount: data.count || data.corrections?.length || 0 }));
    } catch (err) {
      console.error("Pending corrections fetch error:", err);
    }
  };

  const fetchTrainingQueue = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/training-queue?limit=100");
      if (!res.ok) throw new Error("Failed to fetch training queue");
      const data = await res.json();
      setTrainingQueue(data.queue || []);
      setStats(prev => ({ ...prev, readyToTrain: data.count || 0 }));
    } catch (err) {
      console.error("Training queue fetch error:", err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      const data = await res.json();
      setStats(prev => ({
        ...prev,
        currentAccuracy: data.current_accuracy || 94,
        modelVersion: data.model_version || "v2.4.1",
        accuracyChange: data.accuracy_change || 2.4,
      }));
    } catch (err) {
      console.error("Admin stats fetch error:", err);
    }
  };

  const handleVerifyClick = (correction) => {
    setSelectedCorrection(correction);
    setApprovedSentiment(correction.corrected_sentiment || "neutral");
    setCalibratedConfidence(Math.round((correction.confidence_override || 0.5) * 100));
    setRefinedAspects(correction.aspects || []);
    setNewAspect("");
    setShowVerifyModal(true);
  };

  const handleCloseVerifyModal = () => {
    setShowVerifyModal(false);
    setSelectedCorrection(null);
    setApprovedSentiment("neutral");
    setCalibratedConfidence(87);
    setRefinedAspects([]);
    setNewAspect("");
  };

  const handleApproveAndQueue = async () => {
    if (!selectedCorrection) return;

    try {
      const payload = {
        admin_email: session.user.email,
        notes: "Approved by admin",
      };

      const res = await fetch(`http://localhost:8000/admin/corrections/${selectedCorrection._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to approve correction");

      handleCloseVerifyModal();
      fetchPendingCorrections();
      fetchTrainingQueue();
    } catch (err) {
      alert("Error approving correction: " + err.message);
    }
  };

  const handleDenyAndDiscard = async () => {
    if (!selectedCorrection) return;

    try {
      const payload = {
        admin_email: session.user.email,
        notes: "Rejected by admin",
      };

      const res = await fetch(`http://localhost:8000/admin/corrections/${selectedCorrection._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to reject correction");

      handleCloseVerifyModal();
      fetchPendingCorrections();
    } catch (err) {
      alert("Error rejecting correction: " + err.message);
    }
  };

  const handleAddRefinedAspect = () => {
    if (newAspect.trim() && !refinedAspects.includes(newAspect.trim())) {
      setRefinedAspects([...refinedAspects, newAspect.trim()]);
      setNewAspect("");
    }
  };

  const handleRemoveRefinedAspect = (aspect) => {
    setRefinedAspects(refinedAspects.filter(a => a !== aspect));
  };

  const handleStartTrainingBatch = async () => {
    try {
      // Placeholder for training endpoint
      const res = await fetch("http://localhost:8000/admin/start-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_date: scheduleDate.toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to start training batch");

      setShowTrainingModal(false);
      fetchTrainingQueue();
      alert("Training batch started successfully!");
    } catch (err) {
      alert("Error starting training: " + err.message);
    }
  };

  const handleScheduleUpgrade = () => {
    // Placeholder for scheduling
    console.log("Scheduled upgrade for:", scheduleDate);
    alert("Upgrade scheduled for " + scheduleDate.toLocaleDateString());
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return { bg: "bg-green-50", text: "text-green-700" };
      case "negative": return { bg: "bg-red-50", text: "text-red-700" };
      case "neutral": return { bg: "bg-yellow-50", text: "text-yellow-700" };
      default: return { bg: "bg-gray-50", text: "text-gray-700" };
    }
  };

  const getConfBoostColor = (boost) => {
    if (boost > 0) return { text: "text-green-600", icon: "+" };
    return { text: "text-red-600", icon: "" };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Active Learning Verification</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Shield className="w-4 h-4" />
            System Operational
          </div>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Accuracy */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Current Accuracy</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.currentAccuracy}%</p>
              <p className="text-sm text-gray-500">Model {stats.modelVersion}</p>
            </div>
            <div className={`p-2 rounded-full ${stats.accuracyChange > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className={`text-sm font-bold ${stats.accuracyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.accuracyChange > 0 ? '+' : ''}{stats.accuracyChange}%
              </span>
              <p className="text-xs text-gray-500 mt-0.5">since last train</p>
            </div>
          </div>
        </div>

        {/* Schedule Upgrade */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 uppercase">Schedule Upgrade</p>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <DatePicker
            selected={scheduleDate}
            onChange={(date) => setScheduleDate(date)}
            dateFormat="dd-MM-yyyy"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleScheduleUpgrade}
            className="w-full mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
          >
            Set
          </button>
        </div>

        {/* Ready to Train */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Ready to Train</p>
              <p className="text-3xl font-bold text-gray-900">{stats.readyToTrain}</p>
              <p className="text-sm text-gray-500">reviews</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <button
            onClick={() => setShowTrainingModal(true)}
            className="absolute bottom-4 right-4 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Corrections Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">User Corrections Pending Approval</h2>
            <p className="text-sm text-gray-600 mt-1">Verify user-submitted changes before training</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{stats.pendingCount} pending</span>
            <button
              onClick={fetchPendingCorrections}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proposed Change</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conf. Boost</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingCorrections.map((correction) => {
                const colors = getSentimentColor(correction.original_sentiment);
                const proposedColors = getSentimentColor(correction.corrected_sentiment);
                const boost = (correction.confidence_override || 0.5) - (correction.confidence || 0.5);
                const boostInfo = getConfBoostColor(boost);

                return (
                  <tr key={correction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{correction.review_id?.slice(-4) || correction._id?.slice(-4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {correction.user_email || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {correction.original_sentiment || "Unknown"}
                      </div>
                      <span className="mx-1">→</span>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${proposedColors.bg} ${proposedColors.text}`}>
                        {correction.corrected_sentiment}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${boostInfo.text}`}>
                        {boostInfo.icon}{Math.round(boost * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleVerifyClick(correction)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 text-xs font-medium"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pendingCorrections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No pending corrections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super User Badge */}
      <div className="fixed bottom-6 right-6 bg-yellow-50 border border-yellow-200 rounded-full p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-xs font-medium text-yellow-800">Super User</span>
        </div>
      </div>

      {/* Verify Modal */}
      {showVerifyModal && selectedCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Verify Correction</h3>
                <p className="text-sm text-gray-600">Review ID: #{selectedCorrection.review_id?.slice(-4) || selectedCorrection._id?.slice(-4)} • Submitted by: {selectedCorrection.user_email}</p>
              </div>
              <button onClick={handleCloseVerifyModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Review Content */}
              <div className="lg:col-span-2">
                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-2">Review Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 italic">"{selectedCorrection.review_text || selectedCorrection.text || "Review text unavailable"}"</p>
                </div>
              </div>

              {/* AI Detection */}
              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-gray-400" />
                  AI Detection
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Sentiment</label>
                    <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedCorrection.original_sentiment || "neutral").bg} ${getSentimentColor(selectedCorrection.original_sentiment || "neutral").text}`}>
                      {selectedCorrection.original_sentiment || "Unknown"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Confidence</label>
                    <div className="mt-1 text-sm font-bold text-gray-900">{Math.round((selectedCorrection.confidence || 0) * 100)}%</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Aspects</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(selectedCorrection.aspects || []).map((aspect, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-200 rounded text-xs">
                          {aspect}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Verification */}
              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Admin Verification
              </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Approved Sentiment</label>
                    <select
                      value={approvedSentiment}
                      onChange={(e) => setApprovedSentiment(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Calibrated Confidence</label>
                    <div className="mt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={calibratedConfidence}
                        onChange={(e) => setCalibratedConfidence(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer appearance-none"
                        style={{
                          background: `linear-gradient(to right, #4A7DFF ${calibratedConfidence}%, #E5E7EB ${calibratedConfidence}%)`,
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>{calibratedConfidence}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Refined Aspects</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {refinedAspects.map((aspect, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 border border-blue-200 text-xs text-blue-700 rounded flex items-center gap-1">
                          {aspect}
                          <button onClick={() => handleRemoveRefinedAspect(aspect)} className="text-blue-500 hover:text-blue-700">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newAspect}
                          onChange={(e) => setNewAspect(e.target.value)}
                          placeholder="Add aspect"
                          onKeyDown={(e) => e.key === "Enter" && handleAddRefinedAspect()}
                          className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleAddRefinedAspect}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleDenyAndDiscard}
                className="px-6 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Deny & Discard
              </button>
              <button
                onClick={handleApproveAndQueue}
                className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Queue Modal */}
      {showTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Training Queue</h3>
                <p className="text-sm text-gray-600">Approved reviews ready for integration</p>
              </div>
              <button onClick={() => setShowTrainingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {trainingQueue.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No items in training queue.</p>
              ) : (
                trainingQueue.map((item, idx) => {
                  const colors = getSentimentColor(item.corrected_sentiment || item.sentiment);
                  return (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">#{item.review_id?.slice(-4)}</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {item.corrected_sentiment || item.sentiment}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{item.review_text}"</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {Math.round((item.confidence_override || item.confidence || 0) * 100)}% • Approved: {new Date(item.approved_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={handleStartTrainingBatch}
                disabled={trainingQueue.length === 0}
                className="px-6 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Training Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}