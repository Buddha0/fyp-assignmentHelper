import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isPublicRoute = createRouteMatcher(["/", "/api/webhooks(.*)"]);
const isApiAuthRoute = createRouteMatcher(["/api/auth(.*)","/api/uploadthing(.*)"]);

// Role-specific route matchers
const isDoerRoute = createRouteMatcher(["/doer(.*)"]);
const isPosterRoute = createRouteMatcher(["/poster(.*)"]);
const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)"]);

// Define metadata type
type UserMetadata = {
  role?: 'POSTER' | 'DOER' | 'ADMIN';
};

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // 🚀 Handle API authentication routes first
  if (isApiAuthRoute(req)) return null;

  // 🚀 Handle public routes
  if (isPublicRoute(req)) return null;

  // 🚀 If user is not logged in, redirect to sign in
  if (!userId) {
    console.log("Redirecting to Sign In due to missing userId");
    return redirectToSignIn();
  }
  
  // Get user role from session claims
  const role = sessionClaims?.metadata?.role as UserMetadata['role'];
  
  // Role-based access control for dashboard routes
  if (isDoerRoute(req) && role !== 'DOER') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  if (isPosterRoute(req) && role !== 'POSTER') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  if (isAdminRoute(req) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return null;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
