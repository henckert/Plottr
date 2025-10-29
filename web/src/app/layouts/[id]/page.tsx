'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, Edit, Trash2, ExternalLink, MapPin, Calendar, AlertCircle, Share2, Copy, Eye, Clock } from 'lucide-react';
import { useLayout, useDeleteLayout } from '@/hooks/useLayouts';
import { useSite } from '@/hooks/useSites';
import { useZones } from '@/hooks/useZones';
import { useShareLinks, useCreateShareLink, useDeleteShareLink } from '@/hooks/useShareLinks';
import toast from 'react-hot-toast';

// Simple time formatter
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

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
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

export default function LayoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  // Fetch layout
  const { data: layout, isLoading, error } = useLayout(Number(id));

  // Fetch site
  const { data: site } = useSite(layout?.site_id || null);

  // Fetch zones
  const { data: zonesData } = useZones({ layoutId: Number(id), limit: 100 });
  const zones = zonesData?.data || [];

  // Fetch share links
  const { data: shareLinks = [] } = useShareLinks(Number(id));

  // Delete mutation
  const deleteMutation = useDeleteLayout();

  // Share link mutations
  const createShareMutation = useCreateShareLink();
  const deleteShareMutation = useDeleteShareLink();

  const handleDelete = async () => {
    if (!layout?.version_token) {
      toast.error('Version token missing - please refresh the page');
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        layoutId: Number(id),
        versionToken: layout.version_token,
      });

      toast.success('Layout deleted successfully');
      router.push(layout.site_id ? `/sites/${layout.site_id}` : '/layouts');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Layout was modified by another user. Please refresh and try again.');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to delete layout');
      }
    }
  };

  const handleCreateShareLink = async () => {
    try {
      await createShareMutation.mutateAsync({
        layout_id: Number(id),
        expires_at: expirationDate || undefined,
      });
      setShowShareModal(false);
      setExpirationDate('');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleCopyShareLink = (slug: string) => {
    const url = `${window.location.origin}/share/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard');
  };

  const handleRevokeShareLink = async (shareLinkId: number) => {
    if (!confirm('Revoke this share link? This cannot be undone.')) return;

    try {
      await deleteShareMutation.mutateAsync(shareLinkId);
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading layout...</div>
      </div>
    );
  }

  // Error state
  if (error || !layout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Layout Not Found</h2>
          <p className="text-gray-600 mb-6">
            The layout you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/layouts"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Layouts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/layouts" className="hover:text-gray-900">
            Layouts
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{layout.name}</span>
        </nav>

        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{layout.name}</h1>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  layout.is_published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {layout.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link
              href={`/layouts/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <Link
              href={`/layouts/${id}/editor`}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Open Editor
            </Link>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>

          {/* Site */}
          {site && (
            <div className="flex items-center gap-2 text-gray-700 mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Site:</span>
              <Link
                href={`/sites/${layout.site_id}`}
                className="text-blue-600 hover:text-blue-700"
              >
                {site.name}
              </Link>
            </div>
          )}

          {/* Description */}
          {layout.description && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
              <p className="text-gray-600">{layout.description}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Created {formatDate(layout.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Last updated {formatTimeAgo(layout.updated_at)}</span>
          </div>
        </div>

        {/* Share Links Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Share Links ({shareLinks.length})
            </h2>
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              <Share2 className="w-4 h-4" />
              Create Share Link
            </button>
          </div>

          {shareLinks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No share links yet</p>
              <p className="text-sm text-gray-500">
                Create a share link to let others view this layout without logging in
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shareLinks.map((link) => {
                const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                const expiresIn = link.expires_at
                  ? Math.ceil((new Date(link.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={link.id}
                    className={`border rounded-lg p-4 ${
                      isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* URL */}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-900 truncate">
                            {window.location.origin}/share/{link.slug}
                          </code>
                          <button
                            onClick={() => handleCopyShareLink(link.slug)}
                            className="px-3 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 flex-shrink-0"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{link.view_count} views</span>
                          </div>
                          {link.last_accessed_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Last viewed {formatTimeAgo(link.last_accessed_at)}</span>
                            </div>
                          )}
                          {link.expires_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                {isExpired
                                  ? 'Expired'
                                  : expiresIn && expiresIn < 7
                                  ? `Expires in ${expiresIn} day${expiresIn === 1 ? '' : 's'}`
                                  : `Expires ${formatDate(link.expires_at)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleRevokeShareLink(link.id)}
                        className="px-3 py-2 text-red-700 bg-red-50 rounded hover:bg-red-100 flex-shrink-0 text-sm font-medium"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Zones Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Zones ({zones.length} total)
          </h2>

          {zones.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">No zones yet</p>
              <p className="text-sm text-gray-500 mb-6">
                Open the editor to start adding zones to this layout
              </p>
              <Link
                href={`/layouts/${id}/editor`}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open Editor
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{zone.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{zone.zone_type || 'other'}</p>
                  {zone.area_sqm && (
                    <p className="text-xs text-gray-500">
                      {zone.area_sqm.toFixed(2)} sq m
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Layout?</h3>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>&quot;{layout.name}&quot;</strong>?
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>The layout and all zones</li>
                <li>All zone data and metadata</li>
              </ul>
              <p className="text-sm text-red-800 font-semibold mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-medium"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Share2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Create Share Link</h3>
            </div>

            <p className="text-gray-700 mb-6">
              Create a public share link for <strong>&quot;{layout.name}&quot;</strong>. Anyone with the link can view this layout without logging in.
            </p>

            {/* Optional Expiration */}
            <div className="mb-6">
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expiration (optional)
              </label>
              <input
                type="datetime-local"
                id="expirationDate"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank for a link that never expires
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateShareLink}
                disabled={createShareMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
              >
                {createShareMutation.isPending ? 'Creating...' : 'Create Share Link'}
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setExpirationDate('');
                }}
                disabled={createShareMutation.isPending}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
