import { clerkMiddleware } from "@clerk/nextjs/server";

// Run Clerk on app + API routes, exclude _next/static and assets.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip static files and Next internals, run on everything else
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)"
  ],
};
