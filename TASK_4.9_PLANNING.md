# TASK 4.9 - Create Layout Page - PLANNING

**Created**: October 26, 2025  
**Status**: 📋 PLANNING  
**Estimated Time**: 1-2 hours  
**Dependencies**: ✅ TASK 4.8 (Sites Management)

## Overview

Build the layout creation form that allows users to create new field layouts within a site. Layouts are containers for zones and assets, representing different configurations of a sports facility (e.g., "Tournament Setup", "Training Configuration").

## Requirements from PRD

From `0001-prd-field-layout-designer.md`:

- **US-2**: Create layout with name, description
- **US-9**: Link layouts to parent site
- **FR-3**: Layouts belong to a site (foreign key site_id)
- **FR-5**: Layout has name, description, status (draft/published)
- **Optional**: Template selection for common field types

### Functional Requirements:
- Layout creation form at `/sites/[siteId]/layouts/new`
- Name and description fields
- Automatic site_id association from URL
- Redirect to layout editor on success
- Form validation

## Page Architecture

### Route
```
/sites/[siteId]/layouts/new     # Create layout for specific site
```

### Component Hierarchy
```
CreateLayoutPage (/sites/[siteId]/layouts/new)
├── PageHeader (breadcrumbs, title)
├── SiteInfo (display parent site name)
├── LayoutForm
│   ├── NameInput (required, 1-200 chars)
│   ├── DescriptionTextarea (optional, max 1000 chars)
│   ├── StatusSelect (draft/published, default: draft)
│   └── TemplateSelect (optional - future enhancement)
└── Actions (Cancel, Create Layout)
```

## Data Flow

### Create Layout Flow
```
1. User navigates to /sites/[siteId]/layouts/new
2. Page fetches site details to show parent site name
3. User enters layout name (required)
4. User enters description (optional)
5. User selects status (draft or published, default: draft)
6. User clicks "Create Layout"
   → POST /api/layouts with { site_id, name, description, status }
   → Redirect to /layouts/[layoutId]/editor
```

### Data Model
```typescript
interface LayoutCreate {
  site_id: number;       // From URL params
  name: string;          // Required, 1-200 chars
  description?: string;  // Optional, max 1000 chars
  status?: 'draft' | 'published'; // Default: 'draft'
}
```

## Create Layout Page

**File**: `web/src/app/sites/[siteId]/layouts/new/page.tsx` (NEW)

### Features

1. **Site Context Display**:
   - Show parent site name in header
   - Breadcrumbs: Home > Sites > [Site Name] > Layouts > New

2. **Form Fields**:
   - **Name**: Text input, required, 1-200 characters
   - **Description**: Textarea, optional, max 1000 characters
   - **Status**: Radio buttons or select (Draft/Published), default: Draft

3. **Validation**:
   - Name required
   - Name length: 1-200 characters
   - Description max length: 1000 characters

4. **Actions**:
   - Cancel: Navigate back to `/sites/[siteId]`
   - Create Layout: Submit form → redirect to editor

5. **Loading States**:
   - Show spinner while fetching site
   - Disable submit button while creating

6. **Error Handling**:
   - Show error if site not found
   - Show validation errors inline
   - Show API errors in toast/alert

### UI Design
```
┌────────────────────────────────────────────────────────────┐
│ Home > Sites > Golden Gate Park > Layouts > New            │
├────────────────────────────────────────────────────────────┤
│ Create Layout for Golden Gate Park                         │
│                                                             │
│ Layout Name *                                               │
│ [Tournament Setup v2_____________________________]          │
│                                                             │
│ Description (optional)                                      │
│ ┌─────────────────────────────────────────────────┐         │
│ │ Main tournament field configuration with        │         │
│ │ 12 zones and spectator areas                    │         │
│ │                                                 │         │
│ │                                                 │         │
│ └─────────────────────────────────────────────────┘         │
│ Character count: 67 / 1000                                  │
│                                                             │
│ Status                                                      │
│ ○ Draft    ● Published                                      │
│                                                             │
│ [Cancel]                         [Create Layout]           │
└────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSite } from '@/hooks/useSites';
import { useCreateLayout } from '@/hooks/useLayouts';

export default function CreateLayoutPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  const { data: site, isLoading: siteLoading } = useSite(siteId);
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
        status,
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

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">Site not found</p>
        <Link href="/sites" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Back to Sites
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            {description.length} / 1000 characters
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">Draft</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">Published</span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Draft layouts are only visible to you. Published layouts can be shared.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Link
            href={`/sites/${siteId}`}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createLayoutMutation.isPending || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
```

## Optional Enhancements

### Template Selection (Future Feature)

Add a template picker to create layouts from predefined templates:

```typescript
interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // Image URL
  zones: Zone[];   // Predefined zones
}

const templates: LayoutTemplate[] = [
  {
    id: 'soccer-full',
    name: 'Full Soccer Field',
    description: 'Standard 11v11 soccer field with goals and penalty areas',
    preview: '/templates/soccer-full.png',
    zones: [...],
  },
  {
    id: 'soccer-training',
    name: 'Soccer Training Grid',
    description: '4 training zones with equipment areas',
    preview: '/templates/soccer-training.png',
    zones: [...],
  },
  // ...
];

// UI: Grid of template cards with preview images
<div className="grid grid-cols-3 gap-4">
  {templates.map((template) => (
    <button
      key={template.id}
      onClick={() => setSelectedTemplate(template.id)}
      className={cn(
        "border rounded-lg p-4 hover:border-blue-500",
        selectedTemplate === template.id && "border-blue-500 bg-blue-50"
      )}
    >
      <img src={template.preview} alt={template.name} />
      <h3>{template.name}</h3>
      <p>{template.description}</p>
    </button>
  ))}
</div>
```

## Backend API

**Endpoint**: `POST /api/layouts`

Already implemented in TASK 2. Expected request/response:

```typescript
// Request
POST /api/layouts
{
  "site_id": 1,
  "name": "Tournament Setup v2",
  "description": "Main tournament field configuration",
  "status": "draft"
}

// Response
{
  "data": {
    "id": 42,
    "site_id": 1,
    "name": "Tournament Setup v2",
    "description": "Main tournament field configuration",
    "status": "draft",
    "version_token": "abc-123-def",
    "created_at": "2025-10-26T10:00:00Z",
    "updated_at": "2025-10-26T10:00:00Z"
  }
}
```

## React Query Hook

Check if `useCreateLayout` exists in `web/src/hooks/useLayouts.ts`. If not, add:

```typescript
export function useCreateLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LayoutCreate) => {
      const response = await apiClient.post<{ data: Layout }>('/layouts', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate layouts list and site layouts
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      queryClient.invalidateQueries({ queryKey: ['layouts', { siteId: data.site_id }] });
    },
  });
}
```

## Testing Strategy

### Manual Testing

1. **Create Layout (Minimal)**:
   - Navigate to `/sites/[id]/layouts/new`
   - Enter name only → Create
   - Verify redirect to `/layouts/[id]/editor`

2. **Create Layout (Full)**:
   - Enter name + description
   - Select "Published" status
   - Create → verify saved with correct status

3. **Validation**:
   - Try to create without name → see error
   - Enter 201 characters in name → truncated at 200
   - Enter 1001 characters in description → truncated at 1000

4. **Navigation**:
   - Click "Back to [Site Name]" → return to site detail
   - Click "Cancel" → return to site detail
   - Create layout → redirect to editor

5. **Error Handling**:
   - Try to create layout for non-existent site → see error
   - Backend returns error → see alert with message

### Edge Cases

- Site ID is invalid → show "Site not found" error
- Site ID is non-numeric → show error
- Name is empty string → validation error
- Description > 1000 chars → truncated
- Backend API fails → show error alert
- Network timeout → show error

## Success Criteria

- [ ] User can navigate to `/sites/[siteId]/layouts/new`
- [ ] Page displays parent site name in header
- [ ] User can enter layout name (required)
- [ ] User can enter description (optional, max 1000 chars)
- [ ] User can select status (draft or published)
- [ ] Form validation works (name required)
- [ ] Create button is disabled while submitting
- [ ] Success redirects to `/layouts/[id]/editor`
- [ ] Cancel/Back buttons return to site detail page
- [ ] Error handling works (site not found, API errors)
- [ ] Character count updates as user types description
- [ ] Page is responsive (mobile + desktop)

## Implementation Plan

1. **Check existing hook** (5 min)
   - Verify `useCreateLayout` exists in `useLayouts.ts`
   - If not, add it

2. **Create page** (30 min)
   - Create `/sites/[siteId]/layouts/new/page.tsx`
   - Add breadcrumbs and header
   - Build form with name, description, status fields
   - Add character counter for description

3. **Form handling** (15 min)
   - Implement handleSubmit
   - Add validation
   - Add loading states

4. **Error handling** (10 min)
   - Handle site not found
   - Handle API errors
   - Add inline validation errors

5. **Testing** (20 min)
   - Manual test: create layout
   - Test validation
   - Test navigation

## Next Steps After TASK 4.9

- **TASK 4.10**: Edit Layout Page (`/layouts/[id]/edit`)
- **TASK 4.11**: Asset Placement Tools (Point/LineString drawing)
- **TASK 4.12**: Layout Templates (predefined zone configurations)

---

**Ready to Implement**: All backend APIs complete (TASK 2)  
**Estimated LOC**: ~200 lines (Page 180, Hook 20 if needed)
