# TASK 4.12: Layout Detail Page - Planning Document

**Task:** Create layout detail page showing metadata and zones  
**Status:** In Progress  
**Created:** October 26, 2025  
**Estimated LOC:** ~200 lines

---

## Overview

Build a layout detail page that serves as the information hub for a single layout. Displays layout metadata (name, description, site, status, timestamps), lists all zones, and provides action buttons for editing, deleting, opening editor, and duplicating.

---

## Requirements

### Functional Requirements
1. **Route:** `/layouts/[id]`
2. **Display layout metadata** (name, description, site, status, created/updated)
3. **List all zones** associated with the layout
4. **Action buttons:** Edit, Delete, Open Editor, Duplicate (future)
5. **Breadcrumbs navigation** for context
6. **Loading and error states**
7. **Link to parent site** if site_id exists

### Data Requirements
- Fetch layout via `useLayout(id)` hook
- Fetch zones via `useZones()` hook with layoutId filter
- Fetch site name via `useSite(site_id)` if applicable
- Display zone count

### UI Requirements
- Page header with layout name and status badge
- Metadata section with site, description, timestamps
- Zones grid/list with zone cards
- Action buttons bar
- Breadcrumbs: Home > Layouts > [Layout Name]
- Empty state if no zones
- Loading spinner during fetch

---

## Page Architecture

```
/layouts/[id]
├── Breadcrumbs (Home > Layouts > [Layout Name])
├── Page Header
│   ├── Layout Name
│   ├── Status Badge (Published/Draft)
│   └── Action Buttons (Edit, Delete, Open Editor)
├── Metadata Section
│   ├── Site (with link to site detail)
│   ├── Description
│   ├── Created date
│   └── Last updated date
└── Zones Section
    ├── Section Header ("Zones - 12 total")
    ├── Zones Grid (cards with name, category, area)
    └── Empty State (if no zones: "No zones yet - Open editor to add zones")
```

---

## Data Flow

### 1. Fetch Layout
```typescript
const { data: layout, isLoading, error } = useLayout(Number(id));
```

### 2. Fetch Site (if site_id exists)
```typescript
const { data: siteData } = useSite(layout?.site_id || null);
const site = siteData?.data;
```

### 3. Fetch Zones
```typescript
const { data: zonesData } = useZones({ layoutId: Number(id), limit: 100 });
const zones = zonesData?.data || [];
```

### 4. Delete Layout
```typescript
const deleteMutation = useDeleteLayout();

const handleDelete = async () => {
  await deleteMutation.mutateAsync({
    layoutId: Number(id),
    versionToken: layout.version_token,
  });
  
  router.push(layout.site_id ? `/sites/${layout.site_id}` : '/layouts');
};
```

---

## UI Design

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│ Home > Layouts > Summer Camp 2025                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Summer Camp 2025              ● Published                   │
│                                                             │
│ [Edit] [Delete] [Open Editor]                              │
└─────────────────────────────────────────────────────────────┘
```

### Metadata Section
```
┌─────────────────────────────────────────────────────────────┐
│ Site: Main Sports Complex (link)                            │
│                                                             │
│ Description:                                                │
│ Full layout for summer camp activities including soccer,   │
│ basketball, and volleyball courts.                          │
│                                                             │
│ Created: October 1, 2025                                    │
│ Last Updated: October 26, 2025 (2 hours ago)               │
└─────────────────────────────────────────────────────────────┘
```

### Zones Section
```
┌─────────────────────────────────────────────────────────────┐
│ Zones (12 total)                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┬──────────── │
│ │ Soccer Field │ Basketball   │ Volleyball   │ Warm-up     │
│ │ Playing Area │ Court        │ Court        │ Area        │
│ │ 7,200 sq m   │ 420 sq m     │ 162 sq m     │ 1,500 sq m  │
│ └──────────────┴──────────────┴──────────────┴──────────── │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Empty Zones State
```
┌─────────────────────────────────────────────────────────────┐
│ Zones (0 total)                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   No zones yet                              │
│                                                             │
│          Open the editor to start adding zones              │
│                                                             │
│              [Open Editor]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Code

### File: `web/src/app/layouts/[id]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, Edit, Trash2, ExternalLink, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useLayout, useDeleteLayout } from '@/hooks/useLayouts';
import { useSite } from '@/hooks/useSites';
import { useZones } from '@/hooks/useZones';
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

  // Fetch layout
  const { data: layout, isLoading, error } = useLayout(Number(id));

  // Fetch site
  const { data: siteData } = useSite(layout?.site_id || null);
  const site = siteData?.data;

  // Fetch zones
  const { data: zonesData } = useZones({ layoutId: Number(id), limit: 100 });
  const zones = zonesData?.data || [];

  // Delete mutation
  const deleteMutation = useDeleteLayout();

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
            The layout you're looking for doesn't exist or you don't have access to it.
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
                  <p className="text-sm text-gray-600 mb-2">{zone.category || 'Uncategorized'}</p>
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
    </div>
  );
}
```

---

## Success Criteria

- ✅ Page loads layout and displays metadata
- ✅ Breadcrumbs show correct navigation path
- ✅ Status badge shows Published/Draft
- ✅ Site name links to site detail page
- ✅ Description displays if available
- ✅ Created and updated timestamps formatted correctly
- ✅ Zones section shows zone count
- ✅ Zones grid displays zone cards with name, category, area
- ✅ Empty state shows "No zones yet" with Open Editor button
- ✅ Edit button links to /layouts/[id]/edit
- ✅ Delete button shows confirmation modal
- ✅ Open Editor button links to /layouts/[id]/editor
- ✅ Loading state during fetch
- ✅ 404 error state if layout not found

---

## Testing Checklist

- [ ] Load layout → metadata displays correctly
- [ ] Click site link → navigates to site detail
- [ ] Layout with zones → zones grid appears
- [ ] Layout without zones → empty state appears
- [ ] Click Edit → navigates to edit page
- [ ] Click Delete → confirmation modal appears
- [ ] Confirm delete → layout deleted, redirects appropriately
- [ ] Click Open Editor → navigates to editor
- [ ] Timestamps formatted correctly

---

## Dependencies

- `useLayout(id)` hook (existing)
- `useSite(id)` hook (existing)
- `useZones({ layoutId })` hook (existing)
- `useDeleteLayout()` hook (existing)
- Next.js router for navigation
- Lucide React for icons
- react-hot-toast for notifications

---

## Notes

- **Zone Area:** area_sqm field may be null - handle gracefully
- **Site Link:** Only show if site_id exists and site fetched successfully
- **Delete Redirect:** Go to parent site if site_id exists, else /layouts
- **Empty Zones:** Encourage user to open editor with prominent button
- **Zone Count:** Display in section header for quick overview
