"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pagination_1 = require("../../src/lib/pagination");
describe('Pagination Utilities', () => {
    describe('encodeCursor & decodeCursor', () => {
        it('should encode cursor with ID and sort value', () => {
            const encoded = (0, pagination_1.encodeCursor)(42, '2025-10-16T12:00:00Z');
            expect(typeof encoded).toBe('string');
            expect(encoded.length).toBeGreaterThan(0);
            // Should be base64
            expect(() => Buffer.from(encoded, 'base64')).not.toThrow();
        });
        it('should round-trip cursor encoding/decoding', () => {
            const id = 42;
            const sortValue = '2025-10-16T12:00:00Z';
            const encoded = (0, pagination_1.encodeCursor)(id, sortValue);
            const decoded = (0, pagination_1.decodeCursor)(encoded);
            expect(decoded.id).toBe(id);
            expect(decoded.sortValue).toBe(sortValue);
        });
        it('should encode different sort values', () => {
            const c1 = (0, pagination_1.encodeCursor)(1, 'timestamp');
            const c2 = (0, pagination_1.encodeCursor)(1, 'other-timestamp');
            expect(c1).not.toBe(c2);
        });
        it('should handle numeric sort values', () => {
            const encoded = (0, pagination_1.encodeCursor)(99, 42);
            const decoded = (0, pagination_1.decodeCursor)(encoded);
            expect(decoded.id).toBe(99);
            expect(decoded.sortValue).toBe('42'); // Note: becomes string after encoding
        });
        it('should reject invalid base64 cursor', () => {
            expect(() => (0, pagination_1.decodeCursor)('not-valid-base64!!!!')).toThrow();
        });
        it('should reject cursor with invalid ID', () => {
            const invalidCursor = Buffer.from('invalid:value').toString('base64');
            expect(() => (0, pagination_1.decodeCursor)(invalidCursor)).toThrow('non-numeric ID');
        });
        it('should reject cursor with missing separator', () => {
            const invalidCursor = Buffer.from('42-no-separator').toString('base64');
            expect(() => (0, pagination_1.decodeCursor)(invalidCursor)).toThrow();
        });
    });
    describe('validatePaginationParams', () => {
        it('should accept valid limit', () => {
            const result = (0, pagination_1.validatePaginationParams)(undefined, 50);
            expect(result.limit).toBe(50);
            expect(result.cursor).toBeUndefined();
        });
        it('should use default limit (50) if not provided', () => {
            const result = (0, pagination_1.validatePaginationParams)();
            expect(result.limit).toBe(50);
        });
        it('should enforce limit max (100)', () => {
            expect(() => (0, pagination_1.validatePaginationParams)(undefined, 101)).toThrow('between 1 and 100');
        });
        it('should enforce limit min (1)', () => {
            expect(() => (0, pagination_1.validatePaginationParams)(undefined, 0)).toThrow('between 1 and 100');
        });
        it('should reject negative limit', () => {
            expect(() => (0, pagination_1.validatePaginationParams)(undefined, -10)).toThrow();
        });
        it('should reject non-numeric limit', () => {
            expect(() => (0, pagination_1.validatePaginationParams)(undefined, 'invalid')).toThrow();
        });
        it('should floor float limit', () => {
            const result = (0, pagination_1.validatePaginationParams)(undefined, 42.9);
            expect(result.limit).toBe(42);
        });
        it('should validate and accept valid cursor', () => {
            const cursor = (0, pagination_1.encodeCursor)(42, 'sort-value');
            const result = (0, pagination_1.validatePaginationParams)(cursor, 50);
            expect(result.cursor).toBe(cursor);
        });
        it('should reject invalid cursor', () => {
            expect(() => (0, pagination_1.validatePaginationParams)('invalid-cursor', 50)).toThrow('Invalid cursor');
        });
        it('should reject non-string cursor', () => {
            expect(() => (0, pagination_1.validatePaginationParams)(123, 50)).toThrow('cursor must be a string');
        });
    });
    describe('paginateResults', () => {
        const records = [
            { id: 1, name: 'Item 1', updated_at: '2025-01-01' },
            { id: 2, name: 'Item 2', updated_at: '2025-01-02' },
            { id: 3, name: 'Item 3', updated_at: '2025-01-03' },
            { id: 4, name: 'Item 4', updated_at: '2025-01-04' },
            { id: 5, name: 'Item 5', updated_at: '2025-01-05' },
        ];
        it('should paginate results with limit', () => {
            const params = { limit: 2 };
            const result = (0, pagination_1.paginateResults)(records.slice(0, 3), // Provide limit+1 items to detect has_more
            params, (r) => r.id, (r) => r.updated_at);
            expect(result.data.length).toBe(2);
            expect(result.data[0].id).toBe(1);
            expect(result.data[1].id).toBe(2);
            expect(result.has_more).toBe(true);
            expect(result.next_cursor).toBeDefined();
        });
        it('should set has_more=false for last page', () => {
            const params = { limit: 5 };
            const result = (0, pagination_1.paginateResults)(records, // Exactly 5 items, no extra
            params, (r) => r.id, (r) => r.updated_at);
            expect(result.data.length).toBe(5);
            expect(result.has_more).toBe(false);
            expect(result.next_cursor).toBeUndefined();
        });
        it('should generate correct next_cursor', () => {
            const params = { limit: 2 };
            const result = (0, pagination_1.paginateResults)(records.slice(0, 3), params, (r) => r.id, (r) => r.updated_at);
            expect(result.next_cursor).toBeDefined();
            const decoded = (0, pagination_1.decodeCursor)(result.next_cursor);
            expect(decoded.id).toBe(2); // Last item in returned data
            expect(decoded.sortValue).toBe('2025-01-02');
        });
        it('should handle empty results', () => {
            const params = { limit: 10 };
            const emptyData = [];
            const result = (0, pagination_1.paginateResults)(emptyData, params, (r) => r.id, (r) => r.updated_at);
            expect(result.data.length).toBe(0);
            expect(result.has_more).toBe(false);
            expect(result.next_cursor).toBeUndefined();
        });
        it('should handle single item', () => {
            const params = { limit: 10 };
            const result = (0, pagination_1.paginateResults)([records[0]], params, (r) => r.id, (r) => r.updated_at);
            expect(result.data.length).toBe(1);
            expect(result.has_more).toBe(false);
            expect(result.next_cursor).toBeUndefined();
        });
        it('should use default limit if not provided', () => {
            const params = {}; // No limit
            const manyRecords = Array.from({ length: 60 }, (_, i) => ({
                ...records[0],
                id: i + 1,
            }));
            const result = (0, pagination_1.paginateResults)(manyRecords.slice(0, 51), // 51 items (default limit 50 + 1 for has_more)
            params, (r) => r.id, (r) => r.updated_at);
            expect(result.data.length).toBe(50);
            expect(result.has_more).toBe(true);
        });
    });
    describe('addCursorCondition', () => {
        it('should not modify query if no cursor provided', () => {
            // Mock Knex query builder
            const whereChain = [];
            const mockQuery = {
                where: (fn) => {
                    if (typeof fn === 'function') {
                        const subQ = { where: (field, op, val) => subQ };
                        fn(subQ);
                        whereChain.push(subQ);
                    }
                    return mockQuery;
                },
            };
            (0, pagination_1.addCursorCondition)(mockQuery);
            expect(whereChain.length).toBe(0);
        });
        it('should add cursor condition for forward pagination', () => {
            const calls = [];
            const mockQ2 = {
                where: (field, op, val) => {
                    calls.push({ type: 'inner', field, op, val });
                    return mockQ2;
                },
            };
            const mockQuery = {
                where: (fn) => {
                    calls.push({ type: 'outer-where' });
                    if (typeof fn === 'function') {
                        const subQ = {
                            where: (field, op, val) => {
                                calls.push({ type: 'or-where-left', field, op, val });
                                return subQ;
                            },
                            orWhere: (fn2) => {
                                calls.push({ type: 'or-where-right' });
                                fn2(mockQ2);
                                return subQ;
                            },
                        };
                        fn(subQ);
                    }
                    return mockQuery;
                },
            };
            (0, pagination_1.addCursorCondition)(mockQuery, { id: 42, sortValue: '2025-01-01' }, 'updated_at', 'forward');
            expect(calls.length).toBeGreaterThan(0);
            expect(calls[0].type).toBe('outer-where');
        });
        it('should reject backward pagination (not implemented)', () => {
            const mockQuery = { where: () => mockQuery };
            expect(() => (0, pagination_1.addCursorCondition)(mockQuery, { id: 1, sortValue: 'val' }, 'updated_at', 'backward')).toThrow('not yet implemented');
        });
    });
    describe('Integration: Pagination flow', () => {
        it('should handle full pagination flow', () => {
            // Simulate 10 items
            const allItems = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                created_at: new Date(2025, 0, i + 1).toISOString(),
            }));
            // Page 1: limit=3, should return 3 items and has_more=true
            const page1Params = (0, pagination_1.validatePaginationParams)(undefined, 3);
            const page1Result = (0, pagination_1.paginateResults)(allItems.slice(0, 4), // Request 1 extra to detect has_more
            page1Params, (i) => i.id, (i) => i.created_at);
            expect(page1Result.data.length).toBe(3);
            expect(page1Result.has_more).toBe(true);
            expect(page1Result.next_cursor).toBeDefined();
            // Page 2: use cursor from page1
            const cursor1 = page1Result.next_cursor;
            const page2Params = (0, pagination_1.validatePaginationParams)(cursor1, 3);
            const decoded1 = (0, pagination_1.decodeCursor)(cursor1);
            expect(decoded1.id).toBe(3);
            const page2Result = (0, pagination_1.paginateResults)(allItems.slice(3, 7), // Items starting after cursor
            page2Params, (i) => i.id, (i) => i.created_at);
            expect(page2Result.data.length).toBe(3);
            expect(page2Result.has_more).toBe(true);
            // Page 3: final page
            const cursor2 = page2Result.next_cursor;
            const page3Params = (0, pagination_1.validatePaginationParams)(cursor2, 3);
            const page3Result = (0, pagination_1.paginateResults)(allItems.slice(6, 10), // Last 4 items
            page3Params, (i) => i.id, (i) => i.created_at);
            expect(page3Result.data.length).toBe(3);
            expect(page3Result.has_more).toBe(true); // 4 items - 3 returned = 1 more
            // Last page
            const cursor3 = page3Result.next_cursor;
            const page4Params = (0, pagination_1.validatePaginationParams)(cursor3, 3);
            const page4Result = (0, pagination_1.paginateResults)(allItems.slice(9, 10), // Last item
            page4Params, (i) => i.id, (i) => i.created_at);
            expect(page4Result.data.length).toBe(1);
            expect(page4Result.has_more).toBe(false);
            expect(page4Result.next_cursor).toBeUndefined();
            // Verify we got all unique items
            const allCollected = [
                ...page1Result.data,
                ...page2Result.data,
                ...page3Result.data,
                ...page4Result.data,
            ];
            expect(allCollected.length).toBe(10);
            expect(allCollected.map((i) => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        });
    });
});
