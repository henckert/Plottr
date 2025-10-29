# TASK 5.1: Share Link Repository - Planning Document

## Overview

Implement the repository layer for share links, enabling users to generate unique URLs for public access to their layouts. This is the foundation for TASK 5 (Share Links & Export).

**Status**: 📋 Planning  
**Estimated Time**: 2-3 hours  
**Dependencies**: 
- ✅ TASK 1.6 (ShareLinks table migration)
- ✅ TASK 2.2 (Layouts API for linking)

---

## Objectives

1. Create repository layer with CRUD operations for share links
2. Implement slug generation (8-12 alphanumeric characters)
3. Support optional expiration dates
4. Track view count and last accessed timestamp
5. Enable link revocation (soft delete or hard delete)
6. Follow existing repository patterns (cursor pagination, raw Knex queries)

---

## Database Schema Review

From migration `0012_create_share_links_table.ts`:

```sql
CREATE TABLE share_links (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  slug VARCHAR(12) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_share_links_slug ON share_links(slug);
CREATE INDEX idx_share_links_layout_id ON share_links(layout_id);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at) WHERE expires_at IS NOT NULL;
```

**Key Constraints**:
- `slug` must be unique (enforced by unique constraint)
- `layout_id` FK with CASCADE delete
- `expires_at` nullable (null = never expires)
- `view_count` defaults to 0
- `last_accessed_at` nullable (null = never viewed)

---

## Repository Interface

### File: `src/data/share-links.repo.ts`

```typescript
import { getKnex } from './knex';

export interface ShareLinkRow {
  id: number;
  layout_id: number;
  slug: string;
  expires_at: string | null;
  view_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareLinkFilters {
  layout_id?: number;
  slug?: string;
  expired?: boolean; // Filter by expired status
}

export interface CreateShareLinkInput {
  layout_id: number;
  slug: string;
  expires_at?: string | null;
}

export interface UpdateShareLinkInput {
  expires_at?: string | null;
}

/**
 * Generate a unique slug (8-12 alphanumeric characters).
 * Uses crypto.randomBytes for security.
 * Retries if slug already exists (rare collision).
 */
export async function generateUniqueSlug(length = 10): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const maxRetries = 5;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let slug = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      slug += chars[randomBytes[i] % chars.length];
    }
    
    // Check uniqueness
    const existing = await getBySlug(slug);
    if (!existing) {
      return slug;
    }
  }
  
  throw new Error('Failed to generate unique slug after 5 attempts');
}

/**
 * Create a new share link.
 * Generates slug automatically if not provided.
 */
export async function create(data: CreateShareLinkInput): Promise<ShareLinkRow> {
  const knex = getKnex();
  
  const [row] = await knex('share_links')
    .insert({
      layout_id: data.layout_id,
      slug: data.slug,
      expires_at: data.expires_at || null,
      view_count: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning('*');
  
  return row;
}

/**
 * Get share link by slug (public access).
 * Returns null if not found or expired.
 */
export async function getBySlug(slug: string): Promise<ShareLinkRow | null> {
  const knex = getKnex();
  
  const row = await knex('share_links')
    .where('slug', slug)
    .first();
  
  if (!row) return null;
  
  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null; // Expired
  }
  
  return row;
}

/**
 * Get share link by ID (for owner access).
 */
export async function getById(id: number): Promise<ShareLinkRow | null> {
  const knex = getKnex();
  
  const row = await knex('share_links')
    .where('id', id)
    .first();
  
  return row || null;
}

/**
 * List share links with filters and pagination.
 */
export async function list(
  filters: ShareLinkFilters,
  limit: number,
  cursor?: string
): Promise<ShareLinkRow[]> {
  const knex = getKnex();
  let query = knex('share_links')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(limit);
  
  // Apply filters
  if (filters.layout_id) {
    query = query.where('layout_id', filters.layout_id);
  }
  
  if (filters.slug) {
    query = query.where('slug', filters.slug);
  }
  
  if (filters.expired === true) {
    // Only expired links
    query = query.whereNotNull('expires_at').where('expires_at', '<', knex.fn.now());
  } else if (filters.expired === false) {
    // Only active links (not expired or no expiration)
    query = query.where((qb) => {
      qb.whereNull('expires_at').orWhere('expires_at', '>=', knex.fn.now());
    });
  }
  
  // Apply cursor pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    query = query.where('id', '>', decoded.id);
  }
  
  return await query;
}

/**
 * Update share link (typically to change expiration).
 */
export async function update(id: number, data: UpdateShareLinkInput): Promise<ShareLinkRow> {
  const knex = getKnex();
  
  const [row] = await knex('share_links')
    .where('id', id)
    .update({
      ...data,
      updated_at: knex.fn.now(),
    })
    .returning('*');
  
  if (!row) {
    throw new Error(`Share link ${id} not found`);
  }
  
  return row;
}

/**
 * Delete share link (revoke access).
 */
export async function deleteById(id: number): Promise<void> {
  const knex = getKnex();
  
  const deleted = await knex('share_links')
    .where('id', id)
    .delete();
  
  if (deleted === 0) {
    throw new Error(`Share link ${id} not found`);
  }
}

/**
 * Increment view count and update last accessed timestamp.
 * Called when share link is accessed publicly.
 */
export async function incrementViewCount(slug: string): Promise<void> {
  const knex = getKnex();
  
  await knex('share_links')
    .where('slug', slug)
    .increment('view_count', 1)
    .update({
      last_accessed_at: knex.fn.now(),
    });
}

/**
 * Delete expired share links (cleanup job).
 */
export async function deleteExpired(): Promise<number> {
  const knex = getKnex();
  
  const deleted = await knex('share_links')
    .whereNotNull('expires_at')
    .where('expires_at', '<', knex.fn.now())
    .delete();
  
  return deleted;
}
```

---

## Slug Generation Strategy

### Requirements
- **Length**: 8-12 characters (configurable, default 10)
- **Character Set**: Alphanumeric (a-z, A-Z, 0-9) for URL safety
- **Uniqueness**: Must check database for collisions
- **Security**: Use `crypto.randomBytes()` not `Math.random()`

### Algorithm
```typescript
import crypto from 'crypto';

function generateSlug(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = crypto.randomBytes(length);
  
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars[randomBytes[i] % chars.length];
  }
  
  return slug;
}
```

### Collision Handling
- Check database: `SELECT 1 FROM share_links WHERE slug = ?`
- If exists, retry (max 5 attempts)
- If still fails, throw error (very rare with 62^10 combinations)

**Probability of Collision**:
- 10 chars, 62 possibilities each = 62^10 = 839,299,365,868,340,224 combinations
- With 1 million share links, collision chance ≈ 0.00000012%

---

## Expiration Handling

### Expiration Check
```typescript
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // Never expires
  return new Date(expiresAt) < new Date();
}
```

### Filtering Expired Links
```sql
-- Get only active (non-expired) links
SELECT * FROM share_links
WHERE expires_at IS NULL OR expires_at >= NOW();

-- Get only expired links
SELECT * FROM share_links
WHERE expires_at IS NOT NULL AND expires_at < NOW();
```

### Cleanup Job (Optional)
- Run daily: `DELETE FROM share_links WHERE expires_at < NOW()`
- Or: Keep expired links for analytics (add `revoked` boolean)

---

## Testing Plan

### Unit Tests (Future - TASK 5.2)

**File**: `tests/unit/data/share-links.repo.test.ts`

```typescript
describe('ShareLinksRepository', () => {
  describe('generateUniqueSlug', () => {
    it('generates slug of specified length', async () => {
      const slug = await generateUniqueSlug(12);
      expect(slug).toHaveLength(12);
    });
    
    it('generates unique slugs', async () => {
      const slug1 = await generateUniqueSlug();
      const slug2 = await generateUniqueSlug();
      expect(slug1).not.toBe(slug2);
    });
    
    it('retries on collision', async () => {
      // Mock: First slug exists, second is unique
      // (Requires test helpers to insert duplicate)
    });
  });
  
  describe('create', () => {
    it('creates share link with generated slug', async () => {
      const link = await create({ layout_id: 1, slug: 'testSlug12' });
      expect(link.slug).toBe('testSlug12');
      expect(link.layout_id).toBe(1);
      expect(link.view_count).toBe(0);
    });
    
    it('creates share link with expiration', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString(); // +1 day
      const link = await create({ layout_id: 1, slug: 'expireTest', expires_at: expiresAt });
      expect(link.expires_at).toBe(expiresAt);
    });
  });
  
  describe('getBySlug', () => {
    it('returns share link for valid slug', async () => {
      await create({ layout_id: 1, slug: 'validSlug1' });
      const link = await getBySlug('validSlug1');
      expect(link).toBeDefined();
      expect(link!.slug).toBe('validSlug1');
    });
    
    it('returns null for expired link', async () => {
      const expiresAt = new Date(Date.now() - 1000).toISOString(); // -1 second (expired)
      await create({ layout_id: 1, slug: 'expiredSlug', expires_at: expiresAt });
      const link = await getBySlug('expiredSlug');
      expect(link).toBeNull();
    });
    
    it('returns null for non-existent slug', async () => {
      const link = await getBySlug('nonExistent');
      expect(link).toBeNull();
    });
  });
  
  describe('incrementViewCount', () => {
    it('increments view count and updates last_accessed_at', async () => {
      await create({ layout_id: 1, slug: 'viewTest' });
      await incrementViewCount('viewTest');
      
      const link = await getBySlug('viewTest');
      expect(link!.view_count).toBe(1);
      expect(link!.last_accessed_at).toBeDefined();
    });
  });
  
  describe('deleteExpired', () => {
    it('deletes only expired links', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 86400000).toISOString();
      
      await create({ layout_id: 1, slug: 'expired1', expires_at: expiredAt });
      await create({ layout_id: 1, slug: 'active1', expires_at: futureAt });
      
      const deletedCount = await deleteExpired();
      expect(deletedCount).toBe(1);
      
      const expired = await getBySlug('expired1');
      const active = await getBySlug('active1');
      expect(expired).toBeNull();
      expect(active).toBeDefined();
    });
  });
});
```

### Integration Tests (Future - TASK 5.3)

**File**: `tests/integration/share-links.test.ts`

```typescript
describe('ShareLinks API', () => {
  test('POST /api/share-links creates share link', async () => {
    const res = await request(app)
      .post('/api/share-links')
      .send({ layout_id: 1 });
    
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toHaveLength(10);
    expect(res.body.data.layout_id).toBe(1);
  });
  
  test('GET /share/:slug returns public layout view', async () => {
    const link = await create({ layout_id: 1, slug: 'publicTest' });
    
    const res = await request(app).get(`/share/${link.slug}`);
    
    expect(res.status).toBe(200);
    expect(res.body.layout).toBeDefined();
  });
  
  test('GET /share/:slug increments view count', async () => {
    await create({ layout_id: 1, slug: 'viewCountTest' });
    
    await request(app).get('/share/viewCountTest');
    await request(app).get('/share/viewCountTest');
    
    const link = await getBySlug('viewCountTest');
    expect(link!.view_count).toBe(2);
  });
});
```

---

## Implementation Steps

### Step 1: Create Repository File
1. Create `src/data/share-links.repo.ts`
2. Import `getKnex` from `./knex`
3. Import `crypto` for slug generation
4. Import `decodeCursor` from `@/lib/pagination`

### Step 2: Implement Slug Generation
1. Write `generateUniqueSlug()` function
2. Add collision detection
3. Add retry logic (max 5 attempts)
4. Add error handling

### Step 3: Implement CRUD Methods
1. `create()` - Insert share link
2. `getBySlug()` - Public access (check expiration)
3. `getById()` - Owner access
4. `list()` - Paginated list with filters
5. `update()` - Update expiration
6. `deleteById()` - Revoke link
7. `incrementViewCount()` - Analytics
8. `deleteExpired()` - Cleanup job

### Step 4: Add Type Definitions
1. `ShareLinkRow` interface
2. `ShareLinkFilters` interface
3. `CreateShareLinkInput` interface
4. `UpdateShareLinkInput` interface

### Step 5: Test Manually
1. Run migration: `npm run db:migrate`
2. Open Node REPL: `node -r ts-node/register -r tsconfig-paths/register`
3. Test slug generation: `await generateUniqueSlug()`
4. Test create: `await create({ layout_id: 1, slug: 'test123' })`
5. Test get: `await getBySlug('test123')`
6. Test view count: `await incrementViewCount('test123')`

---

## Error Handling

### Database Errors
- **Unique constraint violation** (slug collision): Retry slug generation
- **FK constraint violation** (layout_id doesn't exist): Throw error
- **Not found** (getBySlug returns null): Return 404 in controller

### Validation Errors
- **Invalid slug format**: Service layer validates (alphanumeric, 8-12 chars)
- **Invalid expires_at**: Service layer validates (must be future date)

### Security
- **Slug brute-forcing**: Rate limit public share link access
- **Slug enumeration**: Use long slugs (10+ chars) to prevent guessing

---

## Performance Considerations

### Indexes
Already created in migration:
- `idx_share_links_slug` (unique lookup, O(log n))
- `idx_share_links_layout_id` (filter by layout, O(log n))
- `idx_share_links_expires_at` (partial index for cleanup, O(log n))

### Query Optimization
- `getBySlug()`: Single index lookup (fast)
- `incrementViewCount()`: Single UPDATE (fast)
- `deleteExpired()`: Uses partial index (fast)

### Caching (Future Enhancement)
- Cache active share links in Redis (TTL = expires_at)
- Invalidate on link creation/deletion

---

## API Design Preview (TASK 5.2-5.4)

### Create Share Link
```
POST /api/share-links
Authorization: Bearer <token>

Body:
{
  "layout_id": 1,
  "expires_at": "2025-12-31T23:59:59Z" // Optional
}

Response:
{
  "data": {
    "id": 123,
    "slug": "aB3dEf9hIj",
    "layout_id": 1,
    "expires_at": "2025-12-31T23:59:59Z",
    "view_count": 0,
    "created_at": "2025-10-27T12:00:00Z"
  }
}
```

### Revoke Share Link
```
DELETE /api/share-links/:id
Authorization: Bearer <token>

Response:
{
  "message": "Share link revoked"
}
```

### Public Access
```
GET /share/:slug

Response:
{
  "layout": {
    "id": 1,
    "name": "Main Field Layout",
    "zones": [...],
    "assets": [...]
  }
}
```

---

## Next Steps

After TASK 5.1 completion:
1. **TASK 5.2**: Share Link Service (business logic, slug generation service)
2. **TASK 5.3**: Share Link Controller (HTTP handlers)
3. **TASK 5.4**: Public Share View Page (read-only frontend)
4. **TASK 5.5**: Share Link Analytics (view count display)

---

## Definition of Done

- [x] Repository file created with all CRUD methods
- [x] Slug generation implemented with collision handling
- [x] Expiration check logic implemented
- [x] View count increment method
- [x] TypeScript interfaces defined
- [ ] Manual testing in Node REPL
- [ ] Code review by team
- [ ] Documentation updated (this planning doc)

---

**Created**: October 27, 2025  
**Estimated Completion**: 2-3 hours  
**Status**: 📋 Planning Complete, Ready to Implement
