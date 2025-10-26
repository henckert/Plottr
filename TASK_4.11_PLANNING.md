# TASK 4.11: Layouts List Page - Planning Document

**Task:** Create centralized layouts list page with filtering and pagination  
**Status:** In Progress  
**Created:** October 26, 2025  
**Estimated LOC:** ~200 lines

---

## Overview

Build a comprehensive layouts list page that displays all layouts with filtering by site, published status, and search by name. This serves as the main entry point for browsing and managing layouts.

---

## Requirements

### Functional Requirements
1. **Route:** `/layouts`
2. **Display all layouts** in paginated grid/list
3. **Filter by site** (dropdown with all sites)
4. **Filter by status** (Draft/Published/All)
5. **Search by name** (client-side filtering)
6. **Cursor-based pagination** (50 layouts per page)
7. **Create new layout** button
8. **Links to editor and edit pages**
9. **Empty state** for no layouts

### Data Requirements
- Fetch layouts via `useLayouts()` hook with cursor pagination
- Fetch sites via `useSites()` for filter dropdown
- Client-side search filtering on name
- Display: name, description, site name, zone count, status, last updated

### UI Requirements
- Responsive grid layout (1-3 columns)
- Layout cards with hover states
- Filter bar with site dropdown, status tabs, search input
- Pagination controls (First Page, Next Page)
- Empty state with "Create your first layout" CTA
- Loading skeleton states

---

## Page Architecture

```
/layouts
├── Page Header
│   ├── Title: "Layouts"
│   └── Create New Layout button
├── Filter Bar
│   ├── Site filter (dropdown: All Sites, Site 1, Site 2...)
│   ├── Status filter (tabs: All, Draft, Published)
│   └── Search input (by name)
├── Layouts Grid
│   ├── Layout Card 1 (name, site, zones, status, updated)
│   ├── Layout Card 2
│   └── ...
├── Pagination
│   ├── First Page button
│   └── Next Page button (disabled if no more)
└── Empty State (if no layouts)
```

---

## Data Flow

### 1. Fetch Layouts with Pagination
```typescript
const [cursor, setCursor] = useState<string | undefined>();
const { data, isLoading, error } = useLayouts(50, cursor);

// data = { data: Layout[], next_cursor?: string, has_more: boolean }
```

### 2. Fetch Sites for Filter
```typescript
const { data: sitesData } = useSites(100); // Get all sites for dropdown
const sites = sitesData?.data || [];
```

### 3. Client-Side Filtering
```typescript
const [siteFilter, setSiteFilter] = useState<number | null>(null);
const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
const [searchQuery, setSearchQuery] = useState('');

const filteredLayouts = useMemo(() => {
  let filtered = data?.data || [];
  
  // Filter by site
  if (siteFilter !== null) {
    filtered = filtered.filter(l => l.site_id === siteFilter);
  }
  
  // Filter by status
  if (statusFilter === 'draft') {
    filtered = filtered.filter(l => !l.is_published);
  } else if (statusFilter === 'published') {
    filtered = filtered.filter(l => l.is_published);
  }
  
  // Search by name
  if (searchQuery) {
    filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  return filtered;
}, [data?.data, siteFilter, statusFilter, searchQuery]);
```

### 4. Pagination
```typescript
const handleNextPage = () => {
  if (data?.next_cursor) {
    setCursor(data.next_cursor);
  }
};

const handleFirstPage = () => {
  setCursor(undefined);
};
```

---

## UI Design

### Filter Bar
```
┌────────────────────────────────────────────────────────────┐
│ Site: [All Sites ▼]  All | Draft | Published              │
│ Search: [Search layouts...                            🔍] │
└────────────────────────────────────────────────────────────┘
```

### Layout Cards (Grid 3 columns)
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ Summer Camp 2025    │ Winter League       │ Practice Fields     │
│ Main Sports Complex │ Downtown Arena      │ Main Sports Complex │
│ 12 zones            │ 8 zones             │ 6 zones             │
│ ● Published         │ ○ Draft             │ ● Published         │
│ Updated 2 hours ago │ Updated 1 day ago   │ Updated 3 days ago  │
│ [Edit] [Open Editor]│ [Edit] [Open Editor]│ [Edit] [Open Editor]│
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### Empty State
```
┌───────────────────────────────────────────────┐
│                                               │
│              📋 No Layouts Yet                │
│                                               │
│  Create your first layout to get started     │
│  with field planning and zone management.    │
│                                               │
│        [+ Create Your First Layout]           │
│                                               │
└───────────────────────────────────────────────┘
```

---

## Implementation Code

### File: `web/src/app/layouts/page.tsx`

```typescript
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, MapPin, Calendar, Edit, ExternalLink } from 'lucide-react';
import { useLayouts } from '@/hooks/useLayouts';
import { useSites } from '@/hooks/useSites';
import { formatDistanceToNow } from 'date-fns';

export default function LayoutsPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch layouts
  const { data: layoutsData, isLoading, error } = useLayouts(50, cursor);
  const layouts = layoutsData?.data || [];

  // Fetch sites for filter
  const { data: sitesData } = useSites(100);
  const sites = sitesData?.data || [];

  // Client-side filtering
  const filteredLayouts = useMemo(() => {
    let filtered = layouts;

    if (siteFilter !== null) {
      filtered = filtered.filter(l => l.site_id === siteFilter);
    }

    if (statusFilter === 'draft') {
      filtered = filtered.filter(l => !l.is_published);
    } else if (statusFilter === 'published') {
      filtered = filtered.filter(l => l.is_published);
    }

    if (searchQuery) {
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [layouts, siteFilter, statusFilter, searchQuery]);

  // Get site name by ID
  const getSiteName = (siteId: number | null) => {
    if (!siteId) return 'No site';
    return sites.find(s => s.id === siteId)?.name || 'Unknown site';
  };

  // Loading state
  if (isLoading && !layouts.length) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && layouts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-6xl mb-6">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Layouts Yet</h2>
            <p className="text-gray-600 mb-8">
              Create your first layout to get started with field planning and zone management.
            </p>
            <Link
              href="/sites"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Your First Layout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Layouts</h1>
          <Link
            href="/sites"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Layout
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Site Filter */}
            <div className="flex-1">
              <label htmlFor="site-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <select
                id="site-filter"
                value={siteFilter ?? ''}
                onChange={(e) => setSiteFilter(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    statusFilter === 'draft'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    statusFilter === 'published'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search layouts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredLayouts.length} of {layouts.length} layouts
        </div>

        {/* Layouts Grid */}
        {filteredLayouts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No layouts match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredLayouts.map((layout) => (
              <div
                key={layout.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Layout Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                  {layout.name}
                </h3>

                {/* Site Name */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{getSiteName(layout.site_id)}</span>
                </div>

                {/* Description */}
                {layout.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {layout.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm mb-4">
                  {/* Zone Count - placeholder, would need to fetch from API */}
                  <span className="text-gray-600">Zones: —</span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      layout.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {layout.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                {/* Last Updated */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Updated {formatDistanceToNow(new Date(layout.updated_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/layouts/${layout.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                  <Link
                    href={`/layouts/${layout.id}/editor`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Editor
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!error && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCursor(undefined)}
              disabled={!cursor}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              First Page
            </button>
            <button
              onClick={() => layoutsData?.next_cursor && setCursor(layoutsData.next_cursor)}
              disabled={!layoutsData?.has_more}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Success Criteria

- ✅ Page displays all layouts in responsive grid
- ✅ Site filter dropdown works (All Sites + individual sites)
- ✅ Status filter tabs work (All/Draft/Published)
- ✅ Search by name filters client-side
- ✅ Pagination controls (First Page, Next Page)
- ✅ Empty state shows "Create your first layout" CTA
- ✅ Layout cards show name, site, status, last updated
- ✅ Edit button links to /layouts/[id]/edit
- ✅ Editor button links to /layouts/[id]/editor
- ✅ Loading skeleton during initial fetch
- ✅ Results count shows filtered vs total

---

## Testing Checklist

- [ ] Load page with no layouts → empty state appears
- [ ] Load page with layouts → grid displays correctly
- [ ] Filter by site → only layouts from that site shown
- [ ] Filter by Draft → only draft layouts shown
- [ ] Filter by Published → only published layouts shown
- [ ] Search by name → results filter correctly
- [ ] Click Next Page → cursor advances, new layouts load
- [ ] Click First Page → returns to page 1
- [ ] Click Edit button → navigates to edit page
- [ ] Click Editor button → navigates to editor page

---

## Dependencies

- `useLayouts(limit, cursor)` hook (existing)
- `useSites(limit)` hook (existing)
- `date-fns` for relative timestamps
- Lucide React for icons

---

## Notes

- **Zone Count:** Not available from Layout type - would need separate API endpoint or include in response
- **Create Button:** Links to /sites (user selects site first, then creates layout from site detail)
- **Filters:** All client-side to avoid complex backend queries
- **Pagination:** Cursor-based for scalability (server returns next_cursor)
- **Responsive:** Grid adapts 1 → 2 → 3 columns based on screen size
