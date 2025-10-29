'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Calendar, Eye, Link as LinkIcon } from 'lucide-react';

// Dynamic import for MapLibre (client-side only)
const MapLibreMap = dynamic(
  () => import('@/components/share/PublicLayoutMap'),
  { ssr: false }
);

interface Zone {
  id: number;
  name: string;
  zone_type: string;
  boundary: any; // GeoJSON Polygon
  color?: string;
  surface?: string;
  area_sqm?: number;
  perimeter_m?: number;
}

interface Asset {
  id: number;
  name: string;
  asset_type: string;
  icon?: string;
  geometry: any; // GeoJSON Point or LineString
}

interface Layout {
  id: number;
  site_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ShareLink {
  id: number;
  slug: string;
  expires_at?: string;
  view_count: number;
  created_at: string;
  last_accessed_at?: string;
}

interface PublicShareData {
  layout: Layout;
  zones: Zone[];
  assets: Asset[];
  share_link: ShareLink;
}

export default function PublicSharePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchShareData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/share/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share link not found or has expired');
          }
          throw new Error('Failed to load shared layout');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared layout...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'This share link does not exist or has expired.'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  const { layout, zones, assets, share_link } = data;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatArea = (areaSqm?: number) => {
    if (!areaSqm) return 'N/A';
    const acres = areaSqm / 4046.86;
    return `${areaSqm.toFixed(0)} m² (${acres.toFixed(2)} acres)`;
  };

  const isExpiringSoon = share_link.expires_at
    ? new Date(share_link.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {layout.name}
              </h1>
              {layout.description && (
                <p className="text-gray-600 mb-4 max-w-3xl">
                  {layout.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Site ID: {layout.site_id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {formatDate(layout.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{share_link.view_count} views</span>
                </div>
              </div>
              {share_link.expires_at && (
                <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  isExpiringSoon
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isExpiringSoon ? '⚠️' : '📅'} Expires {formatDate(share_link.expires_at)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Share Code</div>
              <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono text-gray-900">
                {slug}
              </code>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-[600px]">
                <MapLibreMap zones={zones} assets={assets} />
              </div>
            </div>
          </div>

          {/* Sidebar - Takes 1/3 width on large screens */}
          <div className="lg:col-span-1 space-y-6">
            {/* Zones List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Zones ({zones.length})
              </h2>
              {zones.length === 0 ? (
                <p className="text-gray-500 text-sm">No zones defined</p>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{zone.name}</h3>
                        {zone.color && (
                          <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: zone.color }}
                          />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium capitalize">
                            {zone.zone_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {zone.surface && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Surface:</span>
                            <span className="font-medium capitalize">
                              {zone.surface.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {zone.area_sqm && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Area:</span>
                            <span className="font-medium">
                              {formatArea(zone.area_sqm)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assets List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assets ({assets.length})
              </h2>
              {assets.length === 0 ? (
                <p className="text-gray-500 text-sm">No assets defined</p>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        {asset.icon && (
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                            <i className={`${asset.icon} text-blue-600`}></i>
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {asset.name}
                          </h3>
                          <p className="text-xs text-gray-500 capitalize">
                            {asset.asset_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Powered by Footer */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">Powered by</p>
              <p className="text-sm font-semibold text-gray-900">Plottr</p>
              <p className="text-xs text-gray-500 mt-1">
                Field Layout Designer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
