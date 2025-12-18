//frontend\src\components\AdminSidebar.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  BrainCircuit,
  Settings,
  ChevronLeft,
  Menu,
  Shield,
  BookOpen,
  LogOut,
  ChevronDown,
  UserCog,
} from "lucide-react";

export default function AdminSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const isActive = (path) => pathname === path;

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "User Management",
      path: "/admin/user-management",
      icon: Users,
    },
    {
      name: "System Health",
      path: "/admin/health",
      icon: Activity,
    },
    {
      name: "Active Learning",
      path: "/admin/active-learning",
      icon: BrainCircuit,
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    setShowProfileMenu(false); // Close profile menu when toggling
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
    window.open("https://docs.sentimentplus.com/admin", "_blank");
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Broadcast sidebar state changes
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
      } fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-300 md:flex hidden md:block`}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        <Link href="/admin/dashboard" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <div className="min-w-[2rem] w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-purple-600 to-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight transition-opacity duration-300">
              Admin<span className="text-purple-600">Panel</span>
            </span>
          )}
        </Link>
      </div>

      {/* Toggle Button - Hidden on mobile */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-gray-200 shadow-sm rounded-full p-1 hover:bg-gray-50 transition-colors z-50 hidden md:block"
      >
        {isCollapsed ? (
          <Menu className="w-3.5 h-3.5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
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
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
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
      <div className="p-3 mt-auto border-t border-gray-200">
        <Link
          href="/admin/settings"
          className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
            isActive("/admin/settings")
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Settings className="w-6 h-6 min-w-[24px]" />
          {!isCollapsed && (
            <span className="ml-3 font-medium whitespace-nowrap">Admin Settings</span>
          )}
        </Link>

        {/* Interactive Admin Profile */}
        {session?.user && !isCollapsed && (
          <div className="mt-4 relative" ref={profileMenuRef}>
            <button
              onClick={toggleProfileMenu}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-all flex items-center gap-3 overflow-hidden border border-purple-100 cursor-pointer group"
            >
              <div className="min-w-[2rem] w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden whitespace-nowrap text-left">
                <p className="text-sm font-bold truncate text-gray-800">
                  {session.user.name || "Admin"}
                </p>
                <p className="text-xs truncate text-purple-600">
                  System Admin
                </p>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-purple-600 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slideUp">
                <button
                  onClick={handleLearnMore}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
                >
                  <BookOpen className="w-5 h-5 text-[#4A7DFF]" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#4A7DFF]">
                    Admin Documentation
                  </span>
                </button>
                
                <button
                  onClick={handleSwitchAccount}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group border-t border-gray-100"
                >
                  <UserCog className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Switch Account
                  </span>
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left group border-t border-gray-100"
                >
                  <LogOut className="w-5 h-5 text-[#E95252]" />
                  <span className="text-sm font-medium text-[#E95252] group-hover:text-red-700">
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