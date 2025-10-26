'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSites } from '@/hooks/useSites';
import { PlusCircle, MapPin, Loader2, Search, ArrowRight } from 'lucide-react';

export default function SitesListPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, error } = useSites({ cursor, limit: 50 });

  const sites = data?.data || [];
  const nextCursor = data?.next_cursor;
  const hasMore = data?.has_more;

  // Client-side search filter
  const filteredSites = sites.filter((site) => {
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.address?.toLowerCase().includes(query) ||
      site.city?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">Failed to load sites</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-600 mt-1">
            Manage your sports facilities and field layouts
          </p>
        </div>
        <Link
          href="/sites/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Create Site
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sites by name, address, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sites Table */}
      {filteredSites.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          {searchQuery ? (
            <>
              <p className="text-gray-600 mb-4">No sites match your search</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:underline"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No sites yet</p>
              <Link
                href="/sites/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusCircle className="w-5 h-5" />
                Create your first site
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Coordinates
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <Link
                            href={`/sites/${site.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {site.name}
                          </Link>
                          {site.bbox && (
                            <div className="text-xs text-gray-500 mt-1">
                              Has boundary
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {site.city && site.state
                          ? `${site.city}, ${site.state}`
                          : site.address || 'No address'}
                      </div>
                      {site.country && (
                        <div className="text-xs text-gray-500 mt-1">
                          {site.country}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {site.location ? (
                        <>
                          {site.location.coordinates[1].toFixed(4)}°,{' '}
                          {site.location.coordinates[0].toFixed(4)}°
                        </>
                      ) : (
                        <span className="text-gray-400">No location</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sites/${site.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          View
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(cursor || hasMore) && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                {cursor && (
                  <button
                    onClick={() => setCursor(undefined)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    First Page
                  </button>
                )}
                {hasMore && nextCursor && (
                  <button
                    onClick={() => setCursor(nextCursor)}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Next Page
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
