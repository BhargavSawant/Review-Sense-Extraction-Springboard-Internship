//frontend\src\components\UserSidebar.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  BarChart2,
  History,
  BrainCircuit,
  Settings,
  ChevronLeft,
  Menu,
  BookOpen,
  Users,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export default function UserSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const profileMenuRef = useRef(null);

  const isActive = (path) => pathname === path;

  const navItems = [
    {
      name: "Dashboard",
      path: "/user/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Analysis Page",
      path: "/user/analysis",
      icon: BarChart2,
    },
    {
      name: "History Page",
      path: "/user/history",
      icon: History,
    },
    {
      name: "Active Learning",
      path: "/user/active-learning",
      icon: BrainCircuit,
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    setShowProfileMenu(false);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleSwitchAccount = () => {
    router.push("/login");
  };

  const handleLearnMore = () => {
    window.open("https://docs.sentimentplus.com", "_blank");
  };

  const getInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return session?.user?.email?.[0]?.toUpperCase() || "U";
  };

  // Load profile image from backend
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`http://localhost:8000/user/profile-image/${session.user.email}`);
          const data = await response.json();
          
          if (data.success && data.profile_image) {
            setProfileImage(data.profile_image);
          }
        } catch (error) {
          console.error("Error fetching profile image:", error);
        }
      }
    };

    fetchProfileImage();
  }, [session]);

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = (event) => {
      setProfileImage(event.detail.image);
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarToggle', { 
        detail: { isCollapsed } 
      }));
    }
  }, [isCollapsed]);

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all duration-300 md:flex hidden md:block`}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-700">
        <Link href="/user/dashboard" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <div className="min-w-[2rem] w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-blue-600 to-cyan-600">
            <Sparkles className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight transition-opacity duration-300 text-gray-900 dark:text-white">
              Sentiment<span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">+</span>
            </span>
          )}
        </Link>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm rounded-full p-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors z-50 hidden md:block"
      >
        {isCollapsed ? (
          <Menu className="w-3.5 h-3.5 text-gray-600 dark:text-slate-400" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-slate-400" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-6 h-6 min-w-[24px]" />
              {!isCollapsed && (
                <span className="ml-3 font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 mt-auto border-t border-gray-200 dark:border-slate-700">
        <Link
          href="/user/settings"
          className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
            isActive("/user/settings")
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          }`}
        >
          <Settings className="w-6 h-6 min-w-[24px]" />
          {!isCollapsed && (
            <span className="ml-3 font-medium whitespace-nowrap">Settings</span>
          )}
        </Link>

        {/* Interactive User Profile */}
        {session?.user && !isCollapsed && (
          <div className="mt-4 relative" ref={profileMenuRef}>
            <button
              onClick={toggleProfileMenu}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 transition-all flex items-center gap-3 overflow-hidden border border-blue-100 dark:border-blue-800 cursor-pointer group"
            >
              <div className="min-w-[2rem] w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials()
                )}
              </div>
              <div className="flex-1 overflow-hidden whitespace-nowrap text-left">
                <p className="text-sm font-bold truncate text-gray-800 dark:text-white">
                  {session.user.name || "User"}
                </p>
                <p className="text-xs truncate text-blue-600 dark:text-blue-400">
                  {session.user.email?.split("@")[0] || "User"}
                </p>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-slideUp">
                <button
                  onClick={handleLearnMore}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left group"
                >
                  <BookOpen className="w-5 h-5 text-[#4A7DFF]" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-[#4A7DFF]">
                    Learn More
                  </span>
                </button>
                
                <button
                  onClick={handleSwitchAccount}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left group border-t border-gray-100 dark:border-slate-700"
                >
                  <Users className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    Switch Account
                  </span>
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group border-t border-gray-100 dark:border-slate-700"
                >
                  <LogOut className="w-5 h-5 text-[#E95252]" />
                  <span className="text-sm font-medium text-[#E95252] group-hover:text-red-700 dark:group-hover:text-red-400">
                    Log Out
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </aside>
  );
}