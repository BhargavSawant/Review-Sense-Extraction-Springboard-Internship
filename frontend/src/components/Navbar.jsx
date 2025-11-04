//sentiment-app\frontend\src\components\Navbar.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-indigo-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-white text-xl font-bold">
                Sentiment Analyzer
              </span>
            </Link>
            
            {session && (
              <div className="hidden sm:flex space-x-4">
                <Link
                  href="/analysis"
                  className={`text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/analysis") ? "bg-indigo-700" : ""
                  }`}
                >
                  Analysis
                </Link>
                <Link
                  href="/history"
                  className={`text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/history") ? "bg-indigo-700" : ""
                  }`}
                >
                  My History
                </Link>
                <Link
                  href="/profile"
                  className={`text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/profile") ? "bg-indigo-700" : ""
                  }`}
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Right side - User Info and Auth Buttons */}
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-3">
                  {session.user?.image && (
                    <img
                      className="h-8 w-8 rounded-full border-2 border-white"
                      src={session.user.image}
                      alt={session.user.name || "User"}
                    />
                  )}
                  <span className="text-white text-sm font-medium">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-white hover:text-indigo-100 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}