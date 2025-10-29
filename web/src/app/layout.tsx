import type { Metadata } from "next";
// Temporarily commenting out Clerk for development testing
// import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/config/app";
import Link from "next/link";
import Image from "next/image";
import "@/globals.css";

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/brand/favicon.svg",
    shortcut: "/brand/favicon.svg",
    apple: "/brand/plotiq-mark.svg",
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <ClerkProvider>
      <html lang="en">
        <body>
          <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <Image
                  src="/brand/plotiq-mark.svg"
                  alt={`${SITE_NAME} logo`}
                  width={32}
                  height={32}
                  className="transition-transform group-hover:scale-110"
                />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {SITE_NAME}
                </h1>
              </Link>
              <nav className="flex items-center gap-4">
                {/* Dev mode badge - subtle */}
                {process.env.NODE_ENV === 'development' && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    Dev Mode
                  </span>
                )}
                {/* 
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-gray-700 hover:text-gray-900">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                */}
              </nav>
            </div>
          </header>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </body>
      </html>
    // </ClerkProvider>
  );
}
