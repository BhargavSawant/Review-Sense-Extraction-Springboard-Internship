//frontend\src\app\user\layout.jsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserSidebar from "@/components/UserSidebar";

export default function UserLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Listen for sidebar toggle events
    const handleSidebarToggle = (event) => {
      setSidebarCollapsed(event.detail.isCollapsed);
    };

    // Check screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Calculate margin based on screen size and sidebar state
  const getMarginLeft = () => {
    if (isMobile) return '0';
    return sidebarCollapsed ? '5rem' : '16rem';
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      <UserSidebar />
      <main 
        className="flex-1 transition-all duration-300 ease-in-out w-full md:w-auto"
        style={{ 
          marginLeft: getMarginLeft()
        }}
      >
        {children}
      </main>
    </div>
  );
}