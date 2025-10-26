/**
 * LayoutHeader - Header bar for layout editor page
 * Shows breadcrumbs, layout info, zone count, save status, and action buttons
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Download, Save, ChevronRight } from 'lucide-react';
import type { components } from '@/types/api';

type Layout = components['schemas']['Layout'];

interface LayoutHeaderProps {
  layout: Layout;
  zoneCount: number;
  saveStatus: 'saved' | 'saving' | 'error';
  onBack: () => void;
}

export function LayoutHeader({
  layout,
  zoneCount,
  saveStatus,
  onBack,
}: LayoutHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Format last updated time
  const lastUpdated = new Date(layout.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo = '';
  if (diffDays > 0) {
    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = 'just now';
  }

  // Save status indicator
  const saveStatusConfig = {
    saved: { text: 'All changes saved', color: 'text-green-600', icon: '✓' },
    saving: { text: 'Saving...', color: 'text-yellow-600', icon: '⋯' },
    error: { text: 'Failed to save', color: 'text-red-600', icon: '⚠' },
  };

  const statusInfo = saveStatusConfig[saveStatus];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm z-10">
      {/* Breadcrumbs */}
      <div className="px-4 py-2 border-b border-gray-100">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/sites" className="hover:text-blue-600">
            Sites
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/sites/${layout.site_id}`} className="hover:text-blue-600">
            Site
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/sites/${layout.site_id}/layouts`} className="hover:text-blue-600">
            Layouts
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/layouts/${layout.id}`} className="hover:text-blue-600">
            {layout.name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Editor</span>
        </nav>
      </div>

      {/* Main header */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Title and metadata */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to layout"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {layout.name}
              {/* version_name not in schema yet - future feature */}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Last updated {timeAgo}
            </p>
          </div>

          {/* Zone count badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
              />
            </svg>
            <span className="font-medium">
              {zoneCount} zone{zoneCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Warning if too many zones */}
          {zoneCount > 150 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg">
              <span className="text-sm">⚠ High zone count</span>
            </div>
          )}
        </div>

        {/* Right: Save status and actions */}
        <div className="flex items-center space-x-3">
          {/* Save status */}
          <div className={`flex items-center gap-2 text-sm ${statusInfo.color}`}>
            <span>{statusInfo.icon}</span>
            <span>{statusInfo.text}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Save Version (future feature) */}
            <button
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              title="Save version (coming soon)"
              disabled
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Version</span>
            </button>

            {/* Export (future feature) */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                title="Export (coming soon)"
                disabled
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50">
                    Export as PNG
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50">
                    Export as GeoJSON
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50">
                    Export as PDF
                  </button>
                </div>
              )}
            </div>

            {/* Settings (future feature) */}
            <button
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings (coming soon)"
              disabled
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
