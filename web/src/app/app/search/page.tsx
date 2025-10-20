import React from 'react';
import { MapContainer } from '@/components/features/MapContainer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Search page - Main search and mapping interface
 * Protected route (requires authentication)
 */
export const metadata = {
  title: 'Search Locations | Plottr',
  description: 'Search and map locations for your field plans',
};

export default async function SearchPage() {
  // Ensure user is authenticated
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  // For now, use 'free' tier - will be replaced with actual user tier from database
  const userTier = 'free' as const;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Page Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Search Locations</h1>
          <p className="text-gray-600 mt-1">Find and select locations for your field plans</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto w-full p-6">
          <MapContainer
            userTier={userTier}
            onLocationSelect={(location) => {
              // TODO: Handle location selection
              console.log('Selected location:', location);
            }}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
