"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (session) {
      router.push("/analysis");
    }
  }, [session, router]);

  const handleNavigation = (path) => {
    setIsAnimating(true);
    setTimeout(() => {
      router.push(path);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      
      <div className="flex min-h-screen items-center justify-center">
        {/* Main Content - Centered */}
        <div 
          className={`w-full max-w-7xl p-8 lg:p-12 transition-transform duration-500 ease-in-out ${
            isAnimating ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="max-w-4xl mx-auto space-y-12 text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-5xl font-bold text-gray-900">
                Sentiment<span className="text-indigo-600">+</span>
              </span>
            </div>

            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Analyze Sentiment with{" "}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI-Powered Insights
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Discover the emotional tone of any text instantly. Our advanced sentiment analysis engine helps you understand whether content is positive, negative, or neutral.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleNavigation('/register')}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all hover:scale-105 shadow-lg"
              >
                Get Started
              </button>
              <button
                onClick={() => handleNavigation('/login')}
                className="px-8 py-4 bg-white hover:bg-gray-50 text-indigo-600 font-medium rounded-lg transition-all hover:scale-105 shadow-lg border border-gray-200"
              >
                Sign In
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-5xl mx-auto">
              <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Fast Analysis</h3>
                  <p className="text-gray-600 text-sm">Get instant sentiment analysis results in seconds. No waiting, no delays.</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Secure & Private</h3>
                  <p className="text-gray-600 text-sm">Your data is encrypted and secure. We never share your information.</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Detailed Insights</h3>
                  <p className="text-gray-600 text-sm">Get comprehensive analysis with positive and negative keyword detection.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}