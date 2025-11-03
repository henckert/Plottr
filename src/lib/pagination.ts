/**
 * Cursor-based pagination utilities for scalable list endpoints.
 * Avoids offset-based pagination issues (data shifting during pagination, poor DB performance).
 * Uses base64-encoded cursors containing the last record's ID and sort field.
 */

export interface CursorPaginationRequest {
  cursor?: string; // base64-encoded cursor from previous response
  limit?: number;  // records per page (default 50, max 100)
}

export interface CursorPaginationResponse<T> {
  data: T[];
  next_cursor?: string; // null/undefined if no more pages
  has_more: boolean;
}

/**
 * Encodes a cursor as base64 for transport in URLs/APIs.
 * Cursor format: `{id}:{sortValue}`
 * Handles Date objects by converting to ISO strings
 */
export function encodeCursor(id: number, sortValue: any): string {
  // Convert Date objects to ISO strings for consistent encoding
  const sortValueStr = sortValue instanceof Date ? sortValue.toISOString() : String(sortValue);
  const cursor = `${id}:${sortValueStr}`;
  return Buffer.from(cursor).toString('base64');
}

/**
 * Decodes a base64 cursor back to {id, sortValue}.
 */
export function decodeCursor(cursor: string): { id: number; sortValue: any } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    // Split on first ':' only, so sortValue can contain ':'
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) throw new Error('Missing separator in cursor');
    
    const idStr = decoded.substring(0, colonIndex);
    const sortValue = decoded.substring(colonIndex + 1);
    
    const id = parseInt(idStr, 10);
    if (isNaN(id)) throw new Error('Invalid cursor: non-numeric ID');
    return { id, sortValue };
  } catch (err) {
    throw new Error(`Invalid cursor format: ${(err as any).message}`);
  }
}

/**
 * Validates and normalizes pagination parameters.
 * @param cursor - Encoded cursor (optional)
 * @param limit - Number of records to fetch (default 50, max 100)
 * @returns { cursor, limit }
 */
export function validatePaginationParams(
  cursor?: string,
  limit?: number
): CursorPaginationRequest {
  // Validate limit
  let validLimit = 50; // default
  if (limit !== undefined) {
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }
    validLimit = Math.floor(limit);
  }

  // Validate cursor
  let validCursor = undefined;
  if (cursor) {
    if (typeof cursor !== 'string') {
      throw new Error('cursor must be a string');
    }
    try {
      decodeCursor(cursor);
      validCursor = cursor;
    } catch (err) {
      throw new Error(`Invalid cursor: ${(err as any).message}`);
    }
  }

  return { cursor: validCursor, limit: validLimit };
}

/**
 * Applies cursor-based pagination to a query result.
 * Returns data + next_cursor for the next request.
 *
 * @param data - Array of records from database (should include 1 extra for has_more detection)
 * @param params - Pagination params {cursor, limit}
 * @param getIdValue - Function to extract ID from a record
 * @param getSortValue - Function to extract sort field from a record
 * @returns { data, next_cursor, has_more }
 */
export function paginateResults<T>(
  data: T[],
  params: CursorPaginationRequest,
  getIdValue: (item: T) => number,
  getSortValue: (item: T) => any
): CursorPaginationResponse<T> {
  const { limit = 50 } = params;

  // Check if we have more pages (we fetch limit+1 to detect this)
  const hasMore = data.length > limit;

  // Return only the requested limit
  const paginatedData = data.slice(0, limit);

  // Generate next cursor from the last item
  let nextCursor: string | undefined;
  if (hasMore && paginatedData.length > 0) {
    const lastItem = paginatedData[paginatedData.length - 1];
    nextCursor = encodeCursor(getIdValue(lastItem), getSortValue(lastItem));
  }

  return {
    data: paginatedData,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}

/**
 * Helper to add cursor conditions to a Knex query.
 * For forward pagination: "id > cursor_id OR (id = cursor_id AND sort_field > cursor_sort)"
 * For backward pagination (future): similar but reversed
 */
export function addCursorCondition(
  query: any,
  cursorParams?: { id: number; sortValue: any },
  sortField: string = 'updated_at',
  direction: 'forward' | 'backward' = 'forward'
): void {
  if (!cursorParams) return;

  const { id, sortValue } = cursorParams;

  if (direction === 'forward') {
    // Skip rows up to and including the cursor row
    query.where((q: any) => {
      q.where('id', '>', id).orWhere((q2: any) => {
        q2.where('id', '=', id).where(sortField, '>', sortValue);
      });
    });
  } else {
    // Backward pagination (not implemented yet)
    throw new Error('Backward pagination not yet implemented');
  }
}
