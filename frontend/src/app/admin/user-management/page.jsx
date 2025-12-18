//frontend\src\app\admin\user-management\page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  MoreVertical,
  Ban,
  Trash2,
  Eye,
  RefreshCw,
  Download,
  TrendingUp,
  X,
  MessageSquare,
  Star,
  MessageCircle,
} from "lucide-react";

export default function CombinedAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // User Management States
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    admin_users: 0,
    new_users_this_month: 0,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionUser, setActionUser] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  // Feedback States
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Common States
  const [loading, setLoading] = useState(true);

  const aspectLabels = {
    dashboard: "Dashboard",
    sentiment_analysis: "Sentiment Analysis",
    aspect_detection: "Aspect Detection",
    emotion_detection: "Emotion Detection",
    active_learning: "Active Learning"
  };

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch all data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchAllData();
    }
  }, [status, session, statusFilter, roleFilter, userSearchQuery, feedbackStatusFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchUserStats(),
        fetchFeedbacks(),
        fetchFeedbackStats()
      ]);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // User Management Functions
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (userSearchQuery) params.append("search", userSearchQuery);

      const response = await fetch(`http://localhost:8000/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch("http://localhost:8000/admin/users/stats");
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleUserAction = async (action, user) => {
    setActionUser(user);
    setConfirmAction(action);
    setShowConfirmDialog(true);
    setShowActionMenu(null);
  };

  const confirmUserAction = async () => {
    if (!actionUser || !confirmAction) return;

    try {
      let endpoint = `http://localhost:8000/admin/users/${actionUser.email}`;
      let method = "PATCH";
      let body = {};

      switch (confirmAction) {
        case "suspend":
          body = { status: "suspended", suspension_reason: suspensionReason };
          break;
        case "activate":
          body = { status: "active" };
          break;
        case "terminate":
          body = { status: "terminated" };
          break;
        case "delete":
          method = "DELETE";
          break;
        case "makeAdmin":
          body = { role: "admin" };
          break;
        case "removeAdmin":
          body = { role: "user" };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : {},
        body: method === "PATCH" ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        fetchAllData();
        setShowConfirmDialog(false);
        setActionUser(null);
        setConfirmAction(null);
        setSuspensionReason("");
      }
    } catch (error) {
      console.error("Error performing action:", error);
    }
  };

  const viewUserDetails = async (user) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${user.email}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedUser(data.user);
        setShowUserModal(true);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const exportUsers = () => {
    const csv = [
      ["Email", "Name", "Status", "Role", "Reviews", "Corrections", "Created"],
      ...users.map(u => [
        u.email,
        u.name || "N/A",
        u.status || "active",
        u.role || "user",
        u.review_count || 0,
        u.correction_count || 0,
        new Date(u.created_at).toLocaleDateString(),
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Feedback Functions
  const fetchFeedbacks = async () => {
    try {
      const params = new URLSearchParams();
      if (feedbackStatusFilter !== "all") params.append("status", feedbackStatusFilter);

      const response = await fetch(`http://localhost:8000/admin/feedback?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.feedbacks);
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    }
  };

  const fetchFeedbackStats = async () => {
    try {
      const response = await fetch("http://localhost:8000/admin/feedback/stats");
      const data = await response.json();
      
      if (data.success) {
        setFeedbackStats(data);
      }
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
    }
  };

  const handleMarkAsRead = async (feedbackId) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" })
      });

      if (response.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleRespondToFeedback = async () => {
    if (!selectedFeedback || !adminResponse.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:8000/admin/feedback/${selectedFeedback._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "responded",
            admin_response: adminResponse
          })
        }
      );

      if (response.ok) {
        setShowResponseModal(false);
        setAdminResponse("");
        fetchAllData();
      }
    } catch (error) {
      console.error("Error responding to feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const response = await fetch(`http://localhost:8000/admin/feedback/${feedbackId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
    }
  };

  const viewFeedbackDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsModal(true);
    if (feedback.status === "unread") {
      handleMarkAsRead(feedback._id);
    }
  };

  const getAverageRating = (ratings) => {
    const values = Object.values(ratings);
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600 bg-green-50";
    if (rating >= 3.5) return "text-green-500 bg-green-50";
    if (rating >= 2.5) return "text-yellow-600 bg-yellow-50";
    if (rating >= 1.5) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.user_email.toLowerCase().includes(feedbackSearchQuery.toLowerCase()) ||
      (feedback.user_name && feedback.user_name.toLowerCase().includes(feedbackSearchQuery.toLowerCase())) ||
      (feedback.detailed_feedback && feedback.detailed_feedback.toLowerCase().includes(feedbackSearchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12">
      {/* FEEDBACK SECTION */}
      <div className="space-y-6">
        {/* Feedback Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor and respond to user feedback</p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Feedback Stats Grid */}
        {feedbackStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase">Total Feedback</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{feedbackStats.total_feedback}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <MessageSquare className="w-6 h-6 text-[#4A7DFF]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase">Unread</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{feedbackStats.unread_feedback}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <MessageCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase">Satisfaction</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-green-600">{feedbackStats.overall_satisfaction}</p>
                    <p className="text-sm text-gray-500">/5.0</p>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase">Top Rated</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {Object.entries(feedbackStats.average_ratings).sort((a, b) => b[1].average - a[1].average)[0]?.[0]?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Search and Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user or feedback content..."
                value={feedbackSearchQuery}
                onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF]"
              />
            </div>

            <select
              value={feedbackStatusFilter}
              onChange={(e) => setFeedbackStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] bg-white"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
            </select>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">All Feedback</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Average Rating</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFeedbacks.map((feedback, idx) => {
                  const avgRating = getAverageRating(feedback.ratings);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                            {(feedback.user_name || feedback.user_email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{feedback.user_name || "Unknown"}</p>
                            <p className="text-sm text-gray-500">{feedback.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRatingColor(avgRating)}`}>
                            {avgRating} / 5.0
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          feedback.status === "unread" ? "bg-orange-50 text-orange-700" :
                          feedback.status === "read" ? "bg-blue-50 text-blue-700" :
                          "bg-green-50 text-green-700"
                        }`}>
                          {feedback.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(feedback.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewFeedbackDetails(feedback)}
                            className="p-2 text-[#4A7DFF] hover:bg-blue-50 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFeedback(feedback._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFeedbacks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No feedback found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t-2 border-gray-300"></div>

      {/* USER MANAGEMENT SECTION */}
      <div className="space-y-6">
        {/* User Management Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={exportUsers}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#4CD4A5] border border-[#4CD4A5] rounded-lg hover:bg-green-600"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{userStats.total_users}</p>
                <p className="text-sm text-green-600 mt-1">+{userStats.new_users_this_month} this month</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-[#4A7DFF]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Active Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{userStats.active_users}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {userStats.total_users > 0 ? ((userStats.active_users / userStats.total_users) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <UserCheck className="w-6 h-6 text-[#4CD4A5]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Suspended</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{userStats.suspended_users}</p>
                <p className="text-sm text-orange-500 mt-1">Requires attention</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Ban className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Admins</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{userStats.admin_users}</p>
                <p className="text-sm text-purple-600 mt-1">System access</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Search and Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF]"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] bg-white"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">All Users</h2>
            <p className="text-sm text-gray-600 mt-1">Manage user accounts and permissions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || "N/A"}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "active" ? "bg-green-50 text-green-700" :
                        user.status === "suspended" ? "bg-orange-50 text-orange-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <>
                            <Shield className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">Admin</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">User</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.review_count || 0} reviews • {user.correction_count || 0} corrections
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 relative">
                        <button
                          onClick={() => viewUserDetails(user)}
                          className="p-2 text-[#4A7DFF] hover:bg-blue-50 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === idx ? null : idx)}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {showActionMenu === idx && (
                          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-48 py-1">
                            <button
                              onClick={() => handleUserAction(user.status === "active" ? "suspend" : "activate", user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                            >
                              <Ban className="w-4 h-4" />
                              {user.status === "active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleUserAction(user.role === "admin" ? "removeAdmin" : "makeAdmin", user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                              <Shield className="w-4 h-4" />
                              {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                            </button>
                            <button
                              onClick={() => handleUserAction("terminate", user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                            >
                              <UserX className="w-4 h-4" />
                              Terminate
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={() => handleUserAction("delete", user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Permanently
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Feedback Details Modal */}
      {showDetailsModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Feedback Details</h3>
                <p className="text-sm text-gray-600">From {selectedFeedback.user_name || selectedFeedback.user_email}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ratings */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase mb-4">Aspect Ratings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedFeedback.ratings).map(([aspect, rating]) => (
                    <div key={aspect} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {aspectLabels[aspect]}
                        </span>
                        <span className="text-lg font-bold text-gray-700">{rating}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Feedback */}
              {selectedFeedback.detailed_feedback && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Detailed Feedback</h4>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.detailed_feedback}</p>
                  </div>
                </div>
              )}

              {/* Admin Response */}
              {selectedFeedback.admin_response && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Admin Response</h4>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.admin_response}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Responded on {new Date(selectedFeedback.responded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              {selectedFeedback.status !== "responded" && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowResponseModal(true);
                  }}
                  className="px-6 py-2.5 bg-[#4A7DFF] text-white font-medium rounded-lg hover:bg-blue-600"
                >
                  Respond to Feedback
                </button>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Respond to Feedback</h3>
            </div>

            <div className="p-6">
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Type your response here..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] resize-none"
                rows={6}
              />
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setAdminResponse("");
                }}
                disabled={submitting}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRespondToFeedback}
                disabled={submitting || !adminResponse.trim()}
                className="px-6 py-2.5 bg-[#4A7DFF] text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Response"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">User Details</h3>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  {(selectedUser.name || selectedUser.email)[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedUser.name || "N/A"}</h4>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedUser.status === "active" ? "bg-green-50 text-green-700" :
                    selectedUser.status === "suspended" ? "bg-orange-50 text-orange-700" :
                    "bg-red-50 text-red-700"
                  }`}>
                    {selectedUser.status || "active"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Role</p>
                  <p className="text-sm font-medium text-gray-900">{selectedUser.role || "user"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Reviews</p>
                  <p className="text-sm font-medium text-gray-900">{selectedUser.reviews || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Corrections</p>
                  <p className="text-sm font-medium text-gray-900">{selectedUser.corrections || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Joined</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {/* Recent Reviews */}
              {selectedUser.recent_reviews && selectedUser.recent_reviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 uppercase mb-3">Recent Reviews</h4>
                  <div className="space-y-2">
                    {selectedUser.recent_reviews.map((review, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-900 italic">"{review.text}"</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {review.sentiment} • {new Date(review.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {confirmAction === "delete" ? "Delete User" :
                 confirmAction === "terminate" ? "Terminate User" :
                 confirmAction === "suspend" ? "Suspend User" :
                 confirmAction === "activate" ? "Activate User" :
                 confirmAction === "makeAdmin" ? "Make Admin" :
                 "Remove Admin"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                {confirmAction === "delete" ? "This will permanently delete the user and all their data. This action cannot be undone." :
                 confirmAction === "terminate" ? "This will terminate the user's account. They will no longer be able to log in." :
                 confirmAction === "suspend" ? "This will temporarily suspend the user's account." :
                 confirmAction === "activate" ? "This will reactivate the user's account." :
                 confirmAction === "makeAdmin" ? "This will grant admin privileges to this user." :
                 "This will remove admin privileges from this user."}
              </p>

              {confirmAction === "suspend" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suspension Reason
                  </label>
                  <textarea
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="Enter reason for suspension..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7DFF]"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setActionUser(null);
                  setConfirmAction(null);
                  setSuspensionReason("");
                }}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmUserAction}
                className={`px-6 py-2.5 font-medium rounded-lg text-white ${
                  confirmAction === "delete" || confirmAction === "terminate" ? "bg-red-500 hover:bg-red-600" :
                  confirmAction === "suspend" ? "bg-orange-500 hover:bg-orange-600" :
                  "bg-[#4A7DFF] hover:bg-blue-600"
                }`}
              >
                {confirmAction === "delete" ? "Delete" :
                 confirmAction === "terminate" ? "Terminate" :
                 confirmAction === "suspend" ? "Suspend" :
                 "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}