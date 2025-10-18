import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <SignedOut>
        <div className="text-center py-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Plottr</h2>
          <p className="text-xl text-gray-600 mb-8">
            Plan and visualize field layouts for sports, events, and more
          </p>
          <p className="text-gray-600">Sign in to get started</p>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h2>
            <p className="text-gray-600 mb-6">Welcome back! Select an option below to get started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/app/layouts"
              className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">My Layouts</h3>
              <p className="text-gray-600">Create and manage your field layouts</p>
            </Link>
            <Link
              href="/app/templates"
              className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Templates</h3>
              <p className="text-gray-600">Browse and use layout templates</p>
            </Link>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
