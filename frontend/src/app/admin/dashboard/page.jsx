"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Users,
  FileText,
  Brain,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const [stats, setStats] = useState({
    total_corrections: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    training_queue: 0,
    current_accuracy: 0,
    model_version: "",
  });

  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    new_users_this_month: 0,
    admin_users: 0,
  });

  const [reviewStats, setReviewStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCorrections, setRecentCorrections] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [activitySummary, setActivitySummary] = useState({
    total_reviews: 0,
    total_corrections: 0,
    unique_users: 0,
    peak_hour: null,
    trend: "stable",
  });

  const [liveStats, setLiveStats] = useState({
    last_5_minutes: { total: 0, reviews: 0, corrections: 0 },
    last_hour: { total: 0, active_users: 0 },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    } else if (status === "authenticated") {
      fetchDashboardData(false);
    }
  }, [status, session, router]);

  const fetchDashboardData = useCallback(async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchUserStats(),
        fetchReviewStats(),
        fetchRecentUsers(),
        fetchRecentCorrections(),
        fetchUserActivityRealtime(),
        fetchLiveStats(),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/users/stats");
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/stats");
      if (res.ok) {
        const data = await res.json();
        setReviewStats(data);
      }
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/users?limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching recent users:", error);
    }
  };

  const fetchRecentCorrections = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/corrections?status=pending_admin_review&limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentCorrections(data.corrections || []);
      }
    } catch (error) {
      console.error("Error fetching recent corrections:", error);
    }
  };

  const fetchUserActivityRealtime = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/user-activity-realtime?hours=24");
      if (res.ok) {
        const data = await res.json();
        console.log("Activity data received:", data); // Debug log
        setActivityData(data.activity_data || []);
        setActivitySummary(data.summary || {});
      }
    } catch (error) {
      console.error("Error fetching user activity:", error);
    }
  };

  const fetchLiveStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/activity-stats-live");
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data.live_stats || {});
      }
    } catch (error) {
      console.error("Error fetching live stats:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-[#4CD4A5] text-white";
      case "suspended":
        return "bg-[#FF7661] text-white";
      case "terminated":
        return "bg-[#E95252] text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const positivePercentage = reviewStats.total > 0 ? (reviewStats.positive / reviewStats.total) * 100 : 0;
  const negativePercentage = reviewStats.total > 0 ? (reviewStats.negative / reviewStats.total) * 100 : 0;

  return (
    <div className="p-6 space-y-6 bg-[#FAF8F5] min-h-screen">
      {/* Header with Live Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {session?.user?.name || "Admin"}</p>
          
          {/* Live Activity Indicators */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-700">
                {liveStats.last_5_minutes?.total || 0} actions (5m)
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <Users className="w-3.5 h-3.5 text-[#4A7DFF]" />
              <span className="text-xs font-medium text-gray-700">
                {liveStats.last_hour?.active_users || 0} active users
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              {activitySummary.trend === "up" ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : activitySummary.trend === "down" ? (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="text-xs font-medium text-gray-700 capitalize">
                {activitySummary.trend || "stable"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              autoRefresh
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Zap className={`w-4 h-4 ${autoRefresh ? "text-blue-600" : "text-gray-400"}`} />
            Auto {autoRefresh ? "ON" : "OFF"}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Updating..." : "Refresh"}
          </button>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500">
                {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#4A7DFF]/10 rounded-lg">
              <Users className="w-6 h-6 text-[#4A7DFF]" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#4CD4A5] text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +{userStats.new_users_this_month}
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{userStats.total_users}</p>
          <p className="text-sm text-gray-500 mt-2">{userStats.active_users} active</p>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#FF7661]/10 rounded-lg">
              <FileText className="w-6 h-6 text-[#FF7661]" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#4CD4A5] text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                {positivePercentage.toFixed(0)}%
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase mb-1">Reviews Analyzed</p>
          <p className="text-3xl font-bold text-gray-900">{reviewStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">{reviewStats.positive} positive</p>
        </div>

        {/* AI Confidence */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#4CD4A5]/10 rounded-lg">
              <Brain className="w-6 h-6 text-[#4CD4A5]" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#4CD4A5] text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Stable
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase mb-1">AI Confidence</p>
          <p className="text-3xl font-bold text-gray-900">{stats.current_accuracy || 94}%</p>
          <p className="text-sm text-gray-500 mt-2">Model {stats.model_version || "v2.4.1"}</p>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-right">
              {stats.pending > 10 ? (
                <div className="flex items-center gap-1 text-orange-500 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Needs Review
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[#4CD4A5] text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Low
                </div>
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase mb-1">Pending Actions</p>
          <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-sm text-gray-500 mt-2">Corrections to review</p>
        </div>
      </div>

      {/* User Activity Chart & Sentiment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">User Activity (Last 24 Hours)</h2>
              <p className="text-sm text-gray-600 mt-1">Real-time reviews and corrections • Updates every 30s</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4A7DFF]"></div>
                <span className="text-xs text-gray-600">Reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF7661]"></div>
                <span className="text-xs text-gray-600">Corrections</span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative h-64">
            {activityData.length > 0 ? (
              <div className="absolute inset-0 flex items-stretch justify-between gap-1">
                {activityData.map((point, idx) => {
                  const maxActivity = Math.max(...activityData.map(d => d.total_activity), 1);
                  const reviewHeight = (point.reviews / maxActivity) * 100;
                  const correctionHeight = (point.corrections / maxActivity) * 100;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group h-full">
                      <div className="w-full relative h-full min-h-0">
                        {/* Reviews Bar (Bottom) */}
                        <div
                          className="absolute bottom-0 w-full rounded-t-lg transition-all duration-300 bg-gradient-to-t from-[#4A7DFF] to-[#4A7DFF]/50"
                          style={{ height: `${reviewHeight}%` }}
                        />
                        {/* Corrections Bar (Stacked on Top) */}
                        <div
                          className="absolute rounded-t-lg transition-all duration-300 bg-gradient-to-t from-[#FF7661] to-[#FF7661]/50"
                          style={{ 
                            height: `${correctionHeight}%`,
                            bottom: `${reviewHeight}%`,
                            width: '100%'
                          }}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10">
                          <div className="font-semibold mb-1.5 text-center border-b border-gray-700 pb-1">{point.time}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-300">Reviews:</span>
                              <span className="font-semibold text-[#4A7DFF]">{point.reviews}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-300">Corrections:</span>
                              <span className="font-semibold text-[#FF7661]">{point.corrections}</span>
                            </div>
                            <div className="flex justify-between gap-3 pt-1 border-t border-gray-700">
                              <span className="text-gray-300">Active Users:</span>
                              <span className="font-semibold">{point.active_users}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity data yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Time Labels */}
          {activityData.length > 0 && (
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
              {activityData.filter((_, idx) => idx % 4 === 0).map((point, idx) => (
                <span key={idx} className="text-xs text-gray-500">{point.time}</span>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Total Reviews</p>
              <p className="text-xl font-bold text-[#4A7DFF]">{activitySummary.total_reviews}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Total Corrections</p>
              <p className="text-xl font-bold text-[#FF7661]">{activitySummary.total_corrections}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Unique Users</p>
              <p className="text-xl font-bold text-gray-900">{activitySummary.unique_users}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Peak Hour</p>
              <p className="text-xl font-bold text-purple-600">
                {activitySummary.peak_hour?.time || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Sentiment Overview */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Sentiment Overview</h2>
            <p className="text-sm text-gray-600 mt-1">Overall distribution</p>
          </div>

          <div className="space-y-6">
            {/* Positive */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#4CD4A5]"></div>
                  <span className="text-sm font-medium text-gray-700">Positive</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{positivePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#4CD4A5] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${positivePercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviewStats.positive} reviews</p>
            </div>

            {/* Neutral */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#4A7DFF]"></div>
                  <span className="text-sm font-medium text-gray-700">Neutral</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {reviewStats.total > 0 ? ((reviewStats.neutral / reviewStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#4A7DFF] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${reviewStats.total > 0 ? (reviewStats.neutral / reviewStats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviewStats.neutral} reviews</p>
            </div>

            {/* Negative */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#E95252]"></div>
                  <span className="text-sm font-medium text-gray-700">Negative</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{negativePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#E95252] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${negativePercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviewStats.negative} reviews</p>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Analyzed</span>
                <span className="text-xl font-bold text-gray-900">{reviewStats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Learning Widget & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Learning Flow */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Active Learning Pipeline</h2>
              <p className="text-sm text-gray-600 mt-1">Human-in-the-loop correction flow</p>
            </div>
            <button
              onClick={() => router.push("/admin/active-learning")}
              className="text-sm text-[#4A7DFF] hover:text-blue-600 font-medium flex items-center gap-1"
            >
              View All <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Flow Diagram */}
          <div className="grid grid-cols-4 gap-4">
            {/* User Corrections */}
            <div className="text-center">
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-[#4A7DFF] mb-3">
                <Users className="w-8 h-8 text-[#4A7DFF] mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.total_corrections}</p>
                <p className="text-xs text-gray-600 mt-1">Total Submitted</p>
              </div>
              <p className="text-xs font-medium text-gray-700">User Corrections</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#4A7DFF]" />
            </div>

            {/* Pending Review */}
            <div className="text-center">
              <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-500 mb-3">
                <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-600 mt-1">Awaiting Review</p>
              </div>
              <p className="text-xs font-medium text-gray-700">Admin Review</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#4CD4A5]" />
            </div>

            {/* Approved for Training */}
            <div className="text-center">
              <div className="bg-green-50 rounded-xl p-4 border-2 border-[#4CD4A5] mb-3">
                <CheckCircle className="w-8 h-8 text-[#4CD4A5] mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-xs text-gray-600 mt-1">Approved</p>
              </div>
              <p className="text-xs font-medium text-gray-700">Training Ready</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-purple-600" />
            </div>

            {/* Training Queue */}
            <div className="text-center">
              <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-600 mb-3">
                <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.training_queue}</p>
                <p className="text-xs text-gray-600 mt-1">In Queue</p>
              </div>
              <p className="text-xs font-medium text-gray-700">ML Training</p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Approval Rate</p>
              <p className="text-lg font-bold text-[#4CD4A5]">
                {stats.total_corrections > 0 ? ((stats.approved / stats.total_corrections) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Rejection Rate</p>
              <p className="text-lg font-bold text-[#E95252]">
                {stats.total_corrections > 0 ? ((stats.rejected / stats.total_corrections) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Pending Rate</p>
              <p className="text-lg font-bold text-orange-500">
                {stats.total_corrections > 0 ? ((stats.pending / stats.total_corrections) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/admin/active-learning")}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[#4A7DFF]" />
                  <span className="text-sm font-medium text-gray-900">Review Corrections</span>
                </div>
                <span className="text-xs font-bold text-[#4A7DFF] bg-white px-2 py-1 rounded-full">
                  {stats.pending}
                </span>
              </button>

              <button
                onClick={() => router.push("/admin/user-management")}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Manage Users</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => router.push("/admin/system-health")}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#4CD4A5]" />
                  <span className="text-sm font-medium text-gray-900">System Health</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4CD4A5] animate-pulse"></div>
                  <span className="text-sm text-gray-700">API Service</span>
                </div>
                <span className="text-xs font-medium text-[#4CD4A5]">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4CD4A5] animate-pulse"></div>
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <span className="text-xs font-medium text-[#4CD4A5]">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4CD4A5] animate-pulse"></div>
                  <span className="text-sm text-gray-700">ML Engine</span>
                </div>
                <span className="text-xs font-medium text-[#4CD4A5]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users & Recent Corrections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Users</h2>
              <p className="text-sm text-gray-600 mt-1">Latest registrations</p>
            </div>
            <button
              onClick={() => router.push("/admin/user-management")}
              className="text-sm text-[#4A7DFF] hover:text-blue-600 font-medium"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {recentUsers.length > 0 ? (
              recentUsers.map((user, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name || "N/A"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(user.status || "active")}`}>
                      {user.status || "active"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent users</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Corrections */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Corrections</h2>
              <p className="text-sm text-gray-600 mt-1">Awaiting admin review</p>
            </div>
            <button
              onClick={() => router.push("/admin/active-learning")}
              className="text-sm text-[#4A7DFF] hover:text-blue-600 font-medium"
            >
              Review All
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {recentCorrections.length > 0 ? (
              recentCorrections.map((correction, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      Review #{correction.review_id?.slice(-6)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(correction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">By: {correction.user_email}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {correction.original_sentiment}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {correction.corrected_sentiment}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No pending corrections</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}