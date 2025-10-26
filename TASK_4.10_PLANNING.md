# TASK 4.10: Edit Layout Page - Planning Document

**Task:** Create edit layout page for updating layout metadata  
**Status:** In Progress  
**Created:** October 26, 2025  
**Estimated LOC:** ~250 lines

---

## Overview

Build a dedicated edit page for updating layout metadata (name, description, visibility). This page mirrors the create layout form but prefills with existing data and handles version tokens for optimistic concurrency control.

---

## Requirements

### Functional Requirements
1. **Route:** `/layouts/[id]/edit`
2. **Fetch existing layout** on page load
3. **Prefill form** with current values (name, description, is_published)
4. **Version token handling** with If-Match header
5. **409 conflict detection** for concurrent edits
6. **Delete layout** with confirmation modal
7. **Success redirect** to layout detail page (or editor)
8. **Breadcrumbs navigation** for context

### Data Requirements
- Fetch layout via `useLayout(id)` hook
- Use `useUpdateLayout()` mutation with version token
- Use `useDeleteLayout()` mutation
- Handle loading/error states

### UI Requirements
- Consistent with create layout form
- Character counter for description (1000 max)
- Visibility radio buttons (Draft/Published)
- Delete button with confirmation
- Loading spinner while fetching layout
- Error messages for failed updates

---

## Page Architecture

```
/layouts/[id]/edit
├── Breadcrumbs (Home > Layouts > [Layout Name] > Edit)
├── Page Header
│   ├── Title: "Edit Layout"
│   └── Cancel button → back to layout detail
├── Form
│   ├── Name (text input, required)
│   ├── Description (textarea, optional, 1000 max)
│   └── Visibility (radio buttons: Draft/Published)
├── Actions
│   ├── Save Changes (primary button)
│   ├── Cancel (secondary button)
│   └── Delete Layout (danger button, far right)
└── Delete Confirmation Modal
    ├── Warning text
    ├── Confirm Delete (danger)
    └── Cancel
```

---

## Data Flow

### 1. Page Load
```typescript
// Fetch existing layout
const { data: layout, isLoading, error } = useLayout(Number(id));

// Prefill form state
useEffect(() => {
  if (layout) {
    setName(layout.name);
    setDescription(layout.description || '');
    setIsPublished(layout.is_published || false);
  }
}, [layout]);
```

### 2. Update Layout
```typescript
const updateMutation = useUpdateLayout();

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  
  const updated = await updateMutation.mutateAsync({
    id: Number(id),
    data: {
      name: name.trim(),
      description: description.trim() || undefined,
      is_published: isPublished,
    },
    versionToken: layout.version_token || '',
  });
  
  router.push(`/layouts/${updated.id}`); // or /layouts/${id}/editor
};
```

### 3. Handle 409 Conflict
```typescript
if (error?.response?.status === 409) {
  toast.error('Layout was modified by another user. Please refresh and try again.');
}
```

### 4. Delete Layout
```typescript
const deleteMutation = useDeleteLayout();

const handleDelete = async () => {
  await deleteMutation.mutateAsync({
    id: Number(id),
    versionToken: layout.version_token || '',
  });
  
  router.push('/layouts'); // or /sites/[siteId]
};
```

---

## UI Design

### Breadcrumbs
```
Home > Layouts > Summer Camp 2025 > Edit
```

### Form Layout
```
┌─────────────────────────────────────────────┐
│ Edit Layout                        [Cancel] │
├─────────────────────────────────────────────┤
│                                             │
│ Name *                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Summer Camp 2025                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Description (optional)                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Main field layout for summer camp...    │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ 127 / 1000 characters                       │
│                                             │
│ Visibility                                  │
│ ○ Draft      Only visible to you            │
│ ● Published  Can be shared with others      │
│                                             │
│ ┌──────────────┐  ┌────────┐  ┌──────────┐ │
│ │ Save Changes │  │ Cancel │  │ Delete   │ │
│ └──────────────┘  └────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

### Delete Confirmation Modal
```
┌───────────────────────────────────────┐
│ ⚠ Delete Layout?                      │
├───────────────────────────────────────┤
│                                       │
│ Are you sure you want to delete      │
│ "Summer Camp 2025"?                   │
│                                       │
│ This will permanently delete:         │
│ • The layout and all zones            │
│ • All zone data and metadata          │
│                                       │
│ This action cannot be undone.         │
│                                       │
│ ┌────────────────┐  ┌──────────────┐ │
│ │ Delete Forever │  │ Cancel       │ │
│ └────────────────┘  └──────────────┘ │
└───────────────────────────────────────┘
```

---

## Implementation Code

### File: `web/src/app/layouts/[id]/edit/page.tsx`

```typescript
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, AlertCircle } from 'lucide-react';
import { useLayout, useUpdateLayout, useDeleteLayout } from '@/hooks/useLayouts';
import { toast } from 'sonner';

export default function EditLayoutPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Fetch existing layout
  const { data: layout, isLoading, error: fetchError } = useLayout(Number(id));

  // Mutations
  const updateMutation = useUpdateLayout();
  const deleteMutation = useDeleteLayout();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Prefill form when layout loads
  useEffect(() => {
    if (layout) {
      setName(layout.name);
      setDescription(layout.description || '');
      setIsPublished(layout.is_published || false);
    }
  }, [layout]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Layout name is required');
      return;
    }

    if (!layout?.version_token) {
      toast.error('Version token missing - please refresh the page');
      return;
    }

    try {
      const updated = await updateMutation.mutateAsync({
        id: Number(id),
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          is_published: isPublished,
        },
        versionToken: layout.version_token,
      });

      toast.success('Layout updated successfully');
      router.push(`/layouts/${updated.id}`); // or /layouts/${id}/editor
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Layout was modified by another user. Please refresh and try again.');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to update layout');
      }
    }
  };

  const handleDelete = async () => {
    if (!layout?.version_token) {
      toast.error('Version token missing - please refresh the page');
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: Number(id),
        versionToken: layout.version_token,
      });

      toast.success('Layout deleted successfully');
      // Redirect to layouts list or parent site
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
  if (fetchError || !layout) {
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

  const charCount = description.length;
  const charLimit = 1000;
  const isOverLimit = charCount > charLimit;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <Link href={`/layouts/${id}`} className="hover:text-gray-900">
            {layout.name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">Edit</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Layout</h1>
          <Link
            href={`/layouts/${id}`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Summer Camp 2025"
                required
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
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Add a description for this layout..."
              />
              <div className={`text-sm mt-1 ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                {charCount} / {charLimit} characters
              </div>
            </div>

            {/* Visibility */}
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

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!name.trim() || isOverLimit || updateMutation.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href={`/layouts/${id}`}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete Layout
              </button>
            </div>
          </form>
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
              Are you sure you want to delete <strong>"{layout.name}"</strong>?
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

- ✅ Page loads existing layout and prefills form
- ✅ Name, description, visibility fields editable
- ✅ Character counter for description (1000 max)
- ✅ Save button triggers PUT /api/layouts/:id with If-Match header
- ✅ 409 conflict detection shows error message
- ✅ Delete button shows confirmation modal
- ✅ Successful update redirects to layout detail/editor
- ✅ Successful delete redirects to layouts list or parent site
- ✅ Loading states for fetch, update, delete
- ✅ Error handling with toast notifications

---

## Testing Checklist

- [ ] Load existing layout → form prefills correctly
- [ ] Update name → saves successfully
- [ ] Update description → character counter works
- [ ] Toggle visibility → saves correctly
- [ ] Concurrent edit → 409 conflict detected
- [ ] Delete layout → confirmation modal → deletion successful
- [ ] Cancel button → returns to layout detail
- [ ] Invalid version token → shows error message
- [ ] Missing layout ID → shows 404 error

---

## Dependencies

- `useLayout(id)` hook (existing in `web/src/hooks/useLayouts.ts`)
- `useUpdateLayout()` hook (existing)
- `useDeleteLayout()` hook (existing)
- Next.js router for navigation
- Lucide React for icons
- Sonner for toast notifications

---

## Notes

- **Version Token:** Critical for optimistic concurrency control
- **Redirect After Delete:** Go to parent site if site_id exists, else /layouts
- **Redirect After Update:** Go to layout detail page (can link to editor instead)
- **Character Limit:** 1000 chars for description (enforced client + server)
- **Delete Confirmation:** Prominent warning about irreversible action
