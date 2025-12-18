// frontend/middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                       req.nextUrl.pathname.startsWith('/register');
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isUserRoute = req.nextUrl.pathname.startsWith('/user');

    console.log('Middleware:', {
      path: req.nextUrl.pathname,
      isAuth,
      role: token?.role
    });

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      console.log('Authenticated user on auth page, redirecting...');
      if (token.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/user/dashboard', req.url));
    }

    // Protect admin routes
    if (isAdminRoute) {
      if (!isAuth) {
        console.log('Unauthenticated access to admin route');
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token.role !== 'admin') {
        console.log('Non-admin trying to access admin route');
        return NextResponse.redirect(new URL('/user/dashboard', req.url));
      }
    }

    // Protect user routes
    if (isUserRoute) {
      if (!isAuth) {
        console.log('Unauthenticated access to user route');
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // If admin tries to access user routes, redirect to admin dashboard
      if (token.role === 'admin') {
        console.log('Admin accessing user route, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let middleware handle authorization
    },
  }
);

export const config = {
  matcher: [
    '/user/:path*', 
    '/admin/:path*', 
    '/login', 
    '/register',
    '/auth/redirecting'
  ],
};