//frontend/src/app/admin/layout.jsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      // Check if user is admin
      if (session?.user?.email !== "admin@sentimentplus.com") {
        router.push("/user/dashboard");
      }
    }
  }, [status, session, router]);

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
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7DFF]"></div>
      </div>
    );
  }

  if (!session || session?.user?.email !== "admin@sentimentplus.com") {
    return null;
  }

  // Calculate margin based on screen size and sidebar state
  const getMarginLeft = () => {
    if (isMobile) return '0';
    return sidebarCollapsed ? '5rem' : '16rem';
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      <AdminSidebar />
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