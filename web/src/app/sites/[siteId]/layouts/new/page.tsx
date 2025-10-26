'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import { useSite } from '@/hooks/useSites';
import { useCreateLayout } from '@/hooks/useLayouts';

export default function CreateLayoutPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const { data: site, isLoading: siteLoading, error: siteError } = useSite(siteId);
  const createLayoutMutation = useCreateLayout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Layout name is required');
      return;
    }

    try {
      const newLayout = await createLayoutMutation.mutateAsync({
        site_id: Number(siteId),
        name: name.trim(),
        description: description.trim() || undefined,
        is_published: isPublished,
      });

      // Redirect to layout editor
      router.push(`/layouts/${newLayout.id}/editor`);
    } catch (error: any) {
      console.error('Failed to create layout:', error);
      alert(error.response?.data?.error?.message || 'Failed to create layout');
    }
  };

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (siteError || !site) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">Site not found</p>
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/sites" className="hover:text-gray-900">
          Sites
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/sites/${siteId}`} className="hover:text-gray-900">
          {site.name}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">New Layout</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {site.name}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Layout</h1>
        <p className="text-gray-600 mt-1">
          Create a new field layout for {site.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Layout Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tournament Setup v2"
            required
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            A descriptive name for this field layout configuration
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this layout configuration..."
            maxLength={1000}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-500">
              Provide additional context about when and how this layout is used
            </p>
            <p className="text-sm text-gray-500">
              {description.length} / 1000
            </p>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visibility
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_published"
                value="false"
                checked={!isPublished}
                onChange={() => setIsPublished(false)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-gray-900 font-medium">Draft</span>
                <p className="text-xs text-gray-500">Only visible to you</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_published"
                value="true"
                checked={isPublished}
                onChange={() => setIsPublished(true)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-gray-900 font-medium">Published</span>
                <p className="text-xs text-gray-500">Can be shared with others</p>
              </div>
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Next step:</strong> After creating this layout, you'll be taken to the editor where you can draw zones and add field markings.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href={`/sites/${siteId}`}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createLayoutMutation.isPending || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {createLayoutMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Layout'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
