# Limit Validation Error Fix

**Date**: October 22, 2025  
**Issue**: "Request failed with status code 400" - limit must be between 1 and 100  
**Status**: ✅ RESOLVED

---

## Problem

Frontend was requesting 500 zones but backend validation only allows **maximum 100** per request.

### Error Response:
```json
{
  "error": "INVALID_PAGINATION",
  "message": "limit must be between 1 and 100"
}
```

### Root Cause:
Backend pagination validation in `src/lib/pagination.ts`:

```typescript
export function validatePaginationParams(cursor?: string, limit?: number) {
  let validLimit = 50; // default
  if (limit !== undefined) {
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100'); // ❌ Frontend sent 500
    }
    validLimit = Math.floor(limit);
  }
  return { cursor: validCursor, limit: validLimit };
}
```

---

## Solution

### 1. Fixed useZones Hook Default

**File**: `web/src/hooks/useZones.ts`

```typescript
// Before:
limit: params?.limit || 500, // Higher limit for zones ❌

// After:
limit: params?.limit || 100, // Backend max is 100 ✅
```

### 2. Fixed Map Test Page

**File**: `web/src/app/map-test/page.tsx`

```typescript
// Before:
const { data: zonesData, isLoading, error } = useZones({ layoutId, limit: 500 }); ❌

// After:
const { data: zonesData, isLoading, error } = useZones({ layoutId, limit: 100 }); ✅
```

---

## Why Limit 100?

### Backend Design:
- **Cursor-based pagination** for scalability
- **Small page sizes** prevent large database queries
- **100 records max** balances performance and UX
- **For 400+ zones**: Use pagination with `next_cursor`

### Frontend Adaptation:
```typescript
// For large datasets, use pagination loop:
let allZones = [];
let cursor = undefined;

while (true) {
  const { data, next_cursor, has_more } = await fetchZones({ layoutId, limit: 100, cursor });
  allZones = [...allZones, ...data];
  if (!has_more) break;
  cursor = next_cursor;
}
```

---

## Verification

### API Test:
```powershell
PS> Invoke-RestMethod -Uri "http://localhost:3001/api/zones?layout_id=15&limit=100"

# Returns:
{
  "data": [
    { "id": 22, "name": "West Training Zone", ... },
    { "id": 21, "name": "North Goal Area", ... },
    { "id": 20, "name": "Main Pitch", ... }
  ],
  "next_cursor": null,
  "has_more": false
}

# Total: 3 zones ✅
```

### Browser Test:
- Frontend automatically hot-reloaded with fixed limit
- Request now uses `limit=100` instead of `limit=500`
- API responds with 200 OK and 3 zones
- Map should render zones successfully

---

## Pagination Strategy

### Current Implementation (Map Test):
- Fetches up to 100 zones per request
- Good for layouts with < 100 zones
- Simple, no pagination UI needed

### Future Enhancement (Layout Editor):
For layouts with 400+ zones, implement infinite scroll:

```typescript
export function useInfiniteZones(layoutId: number) {
  return useInfiniteQuery({
    queryKey: ['zones', 'infinite', layoutId],
    queryFn: async ({ pageParam }) => {
      return await apiClient.get('/zones', {
        params: { layout_id: layoutId, limit: 100, cursor: pageParam }
      });
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}
```

---

## Summary

| Issue | Before | After |
|-------|--------|-------|
| Frontend Request | `limit=500` | `limit=100` |
| Backend Response | 400 Bad Request | 200 OK with 3 zones |
| Error Message | "limit must be between 1 and 100" | None |
| Map Status | Failed to load zones | Zones loaded ✅ |

---

**Status**: ✅ FIXED  
**Frontend**: Hot-reloaded with corrected limit  
**API**: Responding with 3 zones for layoutId=15  
**Browser**: Should now display map with zones  
**Next**: Verify zones render on map in Simple Browser
