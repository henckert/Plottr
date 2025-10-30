'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLayouts } from '@/hooks/useLayouts';
import { useSites } from '@/hooks/useSites';
import { MapPin, Calendar, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

// Simple time formatter
function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

type IntentFilter = 'all' | 'sports' | 'events';

export default function RecentPlansPanel() {
  const [filter, setFilter] = useState<IntentFilter>('all');
  
  // Fetch last 10 layouts ordered by updated_at DESC
  const { data: layoutsData, isLoading, error } = useLayouts({ limit: 10 });
  const layouts = layoutsData?.data || [];

  // Fetch sites for displaying site names
  const { data: sitesData } = useSites({ limit: 100 });
  const sites = sitesData?.data || [];

  // Get site name by ID
  const getSiteName = (siteId: number | null) => {
    if (!siteId) return 'No site';
    const site = sites.find(s => s.id === siteId);
    return site?.name || 'Unknown site';
  };

  // Filter layouts by intent metadata
  const filteredLayouts = layouts.filter(layout => {
    if (filter === 'all') return true;
    
    // Check layout metadata for intent field (from Intent Wizard)
    // @ts-ignore - metadata field will be added in migration
    const metadata = layout.metadata as { intent?: string } | null;
    const intent = metadata?.intent?.toLowerCase();
    
    if (filter === 'sports') {
      return intent === 'sports_tournament' || intent === 'sports_training';
    }
    if (filter === 'events') {
      return intent === 'market' || intent === 'festival' || intent === 'concert';
    }
    
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Recent Plans</h2>
        
        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('sports')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'sports'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sports
          </button>
          <button
            onClick={() => setFilter('events')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'events'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Events
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-600 text-sm">Failed to load recent plans</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredLayouts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No recent plans</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter !== 'all'
              ? 'No plans match this filter'
              : 'Create your first plan to get started'}
          </p>
        </div>
      )}

      {/* Layouts list */}
      {!isLoading && !error && filteredLayouts.length > 0 && (
        <div className="space-y-3">
          {filteredLayouts.map((layout) => (
            <div
              key={layout.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {/* Layout name */}
                <h3 className="font-medium text-gray-900 truncate">
                  {layout.name}
                </h3>
                
                {/* Site name and timestamp */}
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{getSiteName(layout.site_id)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatTimeAgo(layout.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Open button */}
              <Link
                href={`/layouts/${layout.id}/editor`}
                className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Show more link if there are more layouts */}
      {!isLoading && !error && layouts.length >= 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <Link
            href="/layouts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all layouts →
          </Link>
        </div>
      )}
    </div>
  );
}
