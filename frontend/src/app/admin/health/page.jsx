//frontend\src\app\admin\health\page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Database,
  RefreshCw,
  Brain,
  AlertTriangle,
  Info,
  CheckCircle,
  Users,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function SystemHealthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real metrics from API
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
    suspended_users: 0,
    admin_users: 0,
  });

  const [reviewStats, setReviewStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    } else if (status === "authenticated") {
      fetchAllData();
    }
  }, [status, session, router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchUserStats(),
        fetchReviewStats(),
        fetchRecentActivity(),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching system health data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent corrections as activity log
      const res = await fetch("http://localhost:8000/admin/corrections?limit=10");
      if (res.ok) {
        const data = await res.json();
        const activities = data.corrections.map(correction => ({
          timestamp: correction.updated_at || correction.created_at,
          type: correction.status === "pending_admin_review" ? "correction_submitted" : 
                correction.status === "approved" ? "correction_approved" : "correction_rejected",
          user: correction.user_email,
          status: correction.status,
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "correction_submitted":
        return <Info className="w-4 h-4 text-blue-600" />;
      case "correction_approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "correction_rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case "correction_submitted":
        return `${activity.user} submitted a correction for review`;
      case "correction_approved":
        return `Correction from ${activity.user} was approved`;
      case "correction_rejected":
        return `Correction from ${activity.user} was rejected`;
      default:
        return `Activity by ${activity.user}`;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "correction_submitted":
        return "bg-blue-50 border-blue-200";
      case "correction_approved":
        return "bg-green-50 border-green-200";
      case "correction_rejected":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading && stats.total_corrections === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  const systemHealthy = stats.pending < 100 && stats.training_queue < 100;

  return (
    <div className="p-6 space-y-6 bg-[#FAF8F5] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-[#4A7DFF] border-gray-300 rounded focus:ring-[#4A7DFF]"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${systemHealthy ? "bg-[#4CD4A5]" : "bg-[#FF7661]"} animate-pulse`}></div>
            <span className="text-sm font-medium text-gray-900">
              {systemHealthy ? "System Healthy" : "Attention Required"}
            </span>
          </div>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[#4A7DFF]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#4A7DFF]" />
            </div>
            <CheckCircle className="w-5 h-5 text-[#4CD4A5]" />
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{userStats.total_users}</p>
          <p className="text-sm text-gray-500 mt-2">{userStats.active_users} active</p>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[#4CD4A5]/10 rounded-lg">
              <FileText className="w-5 h-5 text-[#4CD4A5]" />
            </div>
            <CheckCircle className="w-5 h-5 text-[#4CD4A5]" />
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase">Total Reviews</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{reviewStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">Analyzed</p>
        </div>

        {/* Pending Corrections */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Activity className="w-5 h-5 text-orange-500" />
            </div>
            {stats.pending > 50 ? (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-[#4CD4A5]" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase">Pending Review</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</p>
          <p className="text-sm text-gray-500 mt-2">Corrections</p>
        </div>

        {/* Training Queue */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <CheckCircle className="w-5 h-5 text-[#4CD4A5]" />
          </div>
          <p className="text-sm font-medium text-gray-600 uppercase">Training Queue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.training_queue}</p>
          <p className="text-sm text-gray-500 mt-2">Ready to train</p>
        </div>
      </div>

      {/* Sentiment Distribution & ML Model Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sentiment Distribution</h2>
              <p className="text-sm text-gray-600 mt-1">Overall review analysis breakdown</p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#4A7DFF]" />
          </div>

          <div className="space-y-4">
            {/* Positive */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Positive</span>
                <span className="text-sm font-bold text-gray-900">
                  {reviewStats.total > 0 ? Math.round((reviewStats.positive / reviewStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#4CD4A5] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${reviewStats.total > 0 ? (reviewStats.positive / reviewStats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviewStats.positive} reviews</p>
            </div>

            {/* Neutral */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Neutral</span>
                <span className="text-sm font-bold text-gray-900">
                  {reviewStats.total > 0 ? Math.round((reviewStats.neutral / reviewStats.total) * 100) : 0}%
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
                <span className="text-sm font-medium text-gray-700">Negative</span>
                <span className="text-sm font-bold text-gray-900">
                  {reviewStats.total > 0 ? Math.round((reviewStats.negative / reviewStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#FF7661] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${reviewStats.total > 0 ? (reviewStats.negative / reviewStats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviewStats.negative} reviews</p>
            </div>
          </div>
        </div>

        {/* ML Model Status */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">ML Engine Status</h3>
              <p className="text-sm text-gray-600">Model {stats.model_version || "v2.4.1"}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Model Accuracy */}
            {stats.current_accuracy > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Model Accuracy</span>
                  <span className="text-sm font-bold text-gray-900">{stats.current_accuracy}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#4CD4A5] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.current_accuracy}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Corrections Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">Approved</p>
                <p className="text-lg font-bold text-[#4CD4A5]">{stats.approved}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pending</p>
                <p className="text-lg font-bold text-orange-500">{stats.pending}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Rejected</p>
                <p className="text-lg font-bold text-red-500">{stats.rejected}</p>
              </div>
            </div>

            {/* Total Corrections */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">Total Corrections</span>
              <span className="text-lg font-bold text-gray-900">{stats.total_corrections}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database & User Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Stats */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <Database className="w-5 h-5 text-[#4CD4A5]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Database Status</h3>
              <p className="text-sm text-gray-600">MongoDB Collections</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Reviews Collection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Reviews</p>
                <p className="text-xs text-gray-500">Analyzed reviews</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{reviewStats.total}</p>
            </div>

            {/* Corrections Collection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Corrections</p>
                <p className="text-xs text-gray-500">User submissions</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{stats.total_corrections}</p>
            </div>

            {/* Training Queue Collection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Training Queue</p>
                <p className="text-xs text-gray-500">Ready for training</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{stats.training_queue}</p>
            </div>

            {/* Users Collection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Users</p>
                <p className="text-xs text-gray-500">Registered accounts</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{userStats.total_users}</p>
            </div>
          </div>
        </div>

        {/* User Management Stats */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-[#4A7DFF]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">User Management</h3>
              <p className="text-sm text-gray-600">Account status breakdown</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Active Users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Active Users</span>
                <span className="text-sm font-bold text-gray-900">{userStats.active_users}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#4CD4A5] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${userStats.total_users > 0 ? (userStats.active_users / userStats.total_users) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Suspended Users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Suspended Users</span>
                <span className="text-sm font-bold text-gray-900">{userStats.suspended_users}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${userStats.total_users > 0 ? (userStats.suspended_users / userStats.total_users) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Admin Users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Admin Users</span>
                <span className="text-sm font-bold text-gray-900">{userStats.admin_users}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${userStats.total_users > 0 ? (userStats.admin_users / userStats.total_users) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">Total Users</span>
              <span className="text-lg font-bold text-gray-900">{userStats.total_users}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-600 mt-1">Latest system events and corrections</p>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, idx) => (
              <div key={idx} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getActivityColor(activity.type)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{getActivityMessage(activity)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    activity.status === "pending_admin_review" ? "bg-blue-50 text-blue-700" :
                    activity.status === "approved" ? "bg-green-50 text-green-700" :
                    "bg-red-50 text-red-700"
                  }`}>
                    {activity.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}