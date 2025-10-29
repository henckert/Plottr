'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    line1?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
}

interface GeocodeSearchProps {
  map: MaplibreMap | null;
  onLocationSelected?: (result: GeocodingResult) => void;
  placeholder?: string;
}

export default function GeocodeSearch({
  map,
  onLocationSelected,
  placeholder = 'Search for an address...',
}: GeocodeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(
          `${apiUrl}/api/geocode/search?q=${encodeURIComponent(query)}&limit=5`
        );

        if (response.status === 429) {
          setError('Search is busy. Try again in a moment.');
          return;
        }

        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const data = await response.json();
        const results = data.data || [];
        
        if (results.length === 0) {
          setError('Address not found. Try a fuller address or drop the pin.');
        }
        
        setResults(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        setError('Unable to search. Please try again.');
        console.error('Geocode error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (result: GeocodingResult) => {
    // Fly to location on map
    if (map) {
      map.flyTo({
        center: [result.lng, result.lat],
        zoom: 16,
        essential: true,
      });
    }

    // Callback with result
    onLocationSelected?.(result);

    // Update UI
    setQuery(result.displayName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        />

        {/* Loading or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && (results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto z-50">
          {error ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <ul className="py-2">
              {results.map((result, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {result.address.line1 || result.displayName.split(',')[0]}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {result.displayName}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 3 && !isLoading && results.length === 0 && !error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-4 text-sm text-slate-600 dark:text-slate-400">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
