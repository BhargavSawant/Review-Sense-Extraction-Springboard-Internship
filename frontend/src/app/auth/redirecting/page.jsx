// frontend/src/app/auth/redirecting/page.jsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Redirecting() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user) {
      const role = session.user.role;
      
      // Redirect based on role
      if (role === "admin") {
        console.log("Redirecting admin to admin dashboard");
        router.push("/admin/dashboard");
      } else {
        console.log("Redirecting user to user dashboard");
        router.push("/user/dashboard");
      }
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}