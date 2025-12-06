// frontend/src/app/user/settings/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Bell,
  Camera,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  Moon,
  Sun,
  Upload,
  Check,
} from "lucide-react";

export default function UserSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState(session?.user?.image || null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      
      if (newMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      
      return newMode;
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: checked,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        alert("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        setShowUploadModal(false);
        // In real app: upload to server
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (activeTab === "security") {
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (formData.newPassword && formData.newPassword.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;
    try {
      console.log("Saving changes:", formData);
      alert("Changes saved successfully!");
    } catch (err) {
      alert("Error saving changes: " + err.message);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F172A] transition-colors duration-200">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-[#E6E2DD] dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
        <h1 className="text-xl font-bold text-[#2C2C2C] dark:text-white">Settings</h1>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E6E2DD] dark:border-slate-700 p-6 shadow-sm transition-colors">
            <div className="relative group">
              {/* Profile Picture with Upload */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {formData.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                
                {/* Camera Overlay */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-white text-xs font-medium">Change</span>
                </button>
              </div>
              
              <h3 className="text-center text-lg font-bold text-[#2C2C2C] dark:text-white mb-2">
                {formData.name}
              </h3>
              <p className="text-center text-sm text-[#6E6E6E] dark:text-slate-400 mb-3">
                {formData.email}
              </p>
              
              {/* Status Badges */}
              <div className="flex justify-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-xs font-medium text-[#4CD4A5] flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Active
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs font-medium text-[#4A7DFF] flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Tabbed Forms */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E6E2DD] dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
            {/* Tabs */}
            <div className="border-b border-[#E6E2DD] dark:border-slate-700">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: "personal", label: "Personal Information", icon: User },
                  { id: "security", label: "Account Security", icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                        isActive
                          ? "border-[#4A7DFF] text-[#4A7DFF]"
                          : "border-transparent text-[#6E6E6E] dark:text-slate-400 hover:text-[#4A7DFF]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "personal" && (
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  {/* Notifications */}
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notification Preferences
                    </label>
                    {[
                      { name: "email", label: "Email Notifications" },
                      { name: "push", label: "Push Notifications" },
                      { name: "sms", label: "SMS Notifications" },
                    ].map((notif) => (
                      <label key={notif.name} className="flex items-center gap-3 mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name={notif.name}
                          checked={formData.notifications[notif.name]}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-[#4A7DFF] bg-gray-100 dark:bg-slate-600 border-[#E6E2DD] dark:border-slate-500 focus:ring-[#4A7DFF] rounded"
                        />
                        <span className="text-sm text-[#6E6E6E] dark:text-slate-300">{notif.label}</span>
                      </label>
                    ))}
                  </div>
                </form>
              )}

              {activeTab === "security" && (
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={handlePasswordToggle}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-[#6E6E6E] dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-[#6E6E6E] dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                      placeholder="Enter new password"
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6E6E6E] dark:text-slate-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E2DD] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#2C2C2C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7DFF] transition-colors"
                      placeholder="Confirm new password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border border-[#E6E2DD] dark:border-slate-600 rounded-xl text-[#6E6E6E] dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-6 py-2.5 bg-[#4A7DFF] text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Upload Profile Picture Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E6E2DD] dark:border-slate-700 w-full max-w-md p-6 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-white">Upload Profile Picture</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-[#6E6E6E] dark:text-slate-400" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-[#E6E2DD] dark:border-slate-600 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-3 text-[#4A7DFF]" />
              <p className="text-sm text-[#6E6E6E] dark:text-slate-300 mb-4">
                Click to upload or drag and drop<br />
                <span className="text-xs">PNG, JPG up to 5MB</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#4A7DFF] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Choose File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}