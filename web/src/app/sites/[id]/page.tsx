'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Loader2, Edit, Trash2, PlusCircle, ArrowLeft, Grid3x3 } from 'lucide-react';
import { useSite, useDeleteSite } from '@/hooks/useSites';
import { useLayouts } from '@/hooks/useLayouts';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: site, isLoading, error } = useSite(siteId);
  const { data: layoutsResponse } = useLayouts({
    siteId: Number(siteId),
    limit: 50,
  });

  const deleteSiteMutation = useDeleteSite();

  const layouts = layoutsResponse?.data || [];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !site) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: site.location?.coordinates || [-122.4194, 37.7749],
      zoom: 15,
    });

    // Add marker for site location
    if (site.location) {
      new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat(site.location.coordinates)
        .addTo(map);
    }

    // Add bbox polygon if exists
    if (site.bbox) {
      map.on('load', () => {
        map.addSource('site-bbox', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: site.bbox!,
          },
        });

        map.addLayer({
          id: 'site-bbox-fill',
          type: 'fill',
          source: 'site-bbox',
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.1,
          },
        });

        map.addLayer({
          id: 'site-bbox-outline',
          type: 'line',
          source: 'site-bbox',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
          },
        });

        // Fit map to bbox
        const coordinates = site.bbox!.coordinates[0];
        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
        );
        map.fitBounds(bounds, { padding: 50 });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [site]);

  // Handle delete
  const handleDelete = async () => {
    if (!site) return;

    try {
      await deleteSiteMutation.mutateAsync({
        siteId: site.id,
        versionToken: site.version_token,
      });
      router.push('/sites');
    } catch (error: any) {
      console.error('Failed to delete site:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete site');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">Failed to load site</p>
        <Link
          href="/sites"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Sites
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sites
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
            {site.address && (
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {site.address}
                {site.city && site.state && ` • ${site.city}, ${site.state}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/sites/${site.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
        <div
          ref={mapContainer}
          className="w-full h-96 border border-gray-300 rounded-lg"
        />
        {site.location && (
          <p className="text-gray-500 text-sm mt-2">
            Coordinates: {site.location.coordinates[1].toFixed(6)}°, {site.location.coordinates[0].toFixed(6)}°
            {site.bbox && ' • Site has defined boundary'}
          </p>
        )}
      </div>

      {/* Layouts */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Layouts ({layouts.length})
          </h2>
          <Link
            href={`/sites/${site.id}/layouts/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4" />
            Create Layout
          </Link>
        </div>

        {layouts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Grid3x3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No layouts yet</p>
            <Link
              href={`/sites/${site.id}/layouts/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusCircle className="w-4 h-4" />
              Create your first layout
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 mb-2">{layout.name}</h3>
                {layout.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {layout.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Updated {new Date(layout.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/layouts/${layout.id}/editor`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                  >
                    Open Editor
                  </Link>
                  <Link
                    href={`/layouts/${layout.id}/edit`}
                    className="px-3 py-2 text-gray-700 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Site</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{site.name}"? This will also delete all associated layouts and zones. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSiteMutation.isPending}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSiteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteSiteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Site
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
