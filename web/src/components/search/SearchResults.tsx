'use client';

import React from 'react';
import { ResultCard } from './ResultCard';
import { Alert } from '@/components/ui/Alert';
import type { Location } from '@/lib/validateSearch';

interface SearchResultsProps {
  results: Location[];
  loading?: boolean;
  error?: string;
  selectedLocation?: Location | null;
  onSelectLocation?: (location: Location) => void;
  userTier?: 'free' | 'paid_individual' | 'club_admin' | 'admin';
  cached?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading = false,
  error,
  selectedLocation,
  onSelectLocation,
  userTier = 'free',
  cached = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 h-20 rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" title="Search Error" dismissible>
        {error}
      </Alert>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No results found</p>
        <p className="text-sm text-gray-400 mt-2">Try a different search query</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cached && (
        <Alert type="info" title="Cached Results">
          These results are from our cache
        </Alert>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((location, index) => (
          <ResultCard
            key={`${location.lat}-${location.lon}-${index}`}
            location={location}
            onClick={() => onSelectLocation?.(location)}
            isSelected={
              selectedLocation?.lat === location.lat &&
              selectedLocation?.lon === location.lon
            }
            userTier={userTier}
          />
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Showing {results.length} result{results.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};
