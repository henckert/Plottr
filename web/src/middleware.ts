import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Custom middleware to handle legacy route redirects + Clerk auth
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Legacy route redirects (Sites/Layouts → Workbench)
  if (pathname === '/sites') {
    // Track that user visited legacy sites page (for migration banner)
    const response = NextResponse.redirect(new URL('/workbench', req.url));
    response.cookies.set('visited-sites-page', 'true', { maxAge: 365 * 24 * 60 * 60 });
    return response;
  }

  if (pathname === '/layouts') {
    // Track that user visited legacy layouts page (for migration banner)
    const response = NextResponse.redirect(new URL('/workbench', req.url));
    response.cookies.set('visited-layouts-page', 'true', { maxAge: 365 * 24 * 60 * 60 });
    return response;
  }

  // Redirect /sites/:id → /workbench?openSite=:id
  const siteIdMatch = pathname.match(/^\/sites\/(\d+)$/);
  if (siteIdMatch) {
    const siteId = siteIdMatch[1];
    const response = NextResponse.redirect(new URL(`/workbench?openSite=${siteId}`, req.url));
    response.cookies.set('visited-sites-page', 'true', { maxAge: 365 * 24 * 60 * 60 });
    return response;
  }

  // Keep /layouts/:id unchanged (editor route)
  // No redirect needed for /layouts/:id paths

  // Run Clerk middleware for auth
  return clerkMiddleware()(req, {} as any);
}

export const config = {
  matcher: [
    // Skip static files and Next internals, run on everything else
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)"
  ],
};
