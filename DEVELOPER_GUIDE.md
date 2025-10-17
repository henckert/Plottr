# Developer Guide

This guide covers development standards, architecture patterns, and best practices for the Plottr backend.

## Project Structure

```
src/
├── index.ts                   # Entry point
├── app.ts                     # Express app setup
├── controllers/               # Request handlers
│   ├── health.controller.ts
│   ├── venues.controller.ts
│   ├── pitches.controller.ts
│   ├── sessions.controller.ts
│   └── geocode.controller.ts
├── services/                  # Business logic
│   ├── venues.service.ts
│   ├── pitches.service.ts
│   ├── sessions.service.ts
│   └── geocode.service.ts
├── routes/                    # Route definitions
│   ├── venues.routes.ts
│   ├── pitches.routes.ts
│   ├── sessions.routes.ts
│   ├── templates.routes.ts
│   ├── geocode.routes.ts
│   └── index.ts
├── middleware/                # Express middleware
│   ├── auth.ts
│   ├── logging.ts
│   └── security.ts
├── models/                    # Database models (Objection.js)
│   ├── Venue.ts
│   ├── Pitch.ts
│   └── Session.ts
├── data/                      # Data layer
│   ├── knex.ts
│   └── queries/
├── errors/                    # Error handling
│   ├── index.ts (AppError class)
│   └── middleware.ts
├── lib/                       # Utilities
│   ├── logger.ts
│   ├── pagination.ts
│   └── geospatial.ts
├── types/                     # TypeScript types
│   ├── openapi.ts (auto-generated)
│   └── index.ts
└── db/                        # Database
    ├── knexfile.ts
    ├── migrations/
    └── seeds/

tests/
├── integration/               # End-to-end tests
├── unit/                      # Isolated tests
└── migrations/                # Schema tests
```

## Architecture Patterns

### Controller Pattern

Controllers handle HTTP requests and delegate to services.

```typescript
export async function getVenue(req: RequestWithLogger, res: Response) {
  const id = req.params.id;
  
  try {
    const venue = await venueService.getById(id);
    if (!venue) {
      return res.status(404).json({ error: { message: 'Not found' } });
    }
    res.json(venue);
  } catch (error) {
    next(error);
  }
}
```

### Service Pattern

Services contain business logic and coordinate data operations.

```typescript
export async function getById(id: string) {
  const venue = await Venue.query().findById(id);
  return venue;
}

export async function create(data: CreateVenueInput) {
  // Validate (Zod schema)
  const validated = VenueCreateSchema.parse(data);
  
  // Create (with defaults)
  const venue = await Venue.query().insert({
    ...validated,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  return venue;
}
```

### Middleware Pattern

Middleware functions process requests in order.

```typescript
// Order matters!
app.use(requestLoggingMiddleware);      // 1. Capture request
app.use(helmet());                       // 2. Security headers
app.use(express.json());                 // 3. Parse body
app.use(publicLimiter);                  // 4. Rate limit public
app.use('/api', authMiddleware);         // 5. Authenticate API
app.use('/api', apiRoutes);              // 6. Route handling
app.use(errorLoggingMiddleware);         // 7. Log errors
app.use(errorHandler);                   // 8. Handle errors
```

### Error Handling Pattern

Always throw errors; let middleware handle them.

```typescript
import { AppError } from '../errors';

export async function update(id: string, payload: any) {
  const existing = await Venue.query().findById(id);
  
  if (!existing) {
    throw new AppError('Venue not found', 404, 'NOT_FOUND');
  }
  
  if (payload.invalid) {
    throw new AppError('Invalid field', 400, 'VALIDATION_ERROR');
  }
  
  return await existing.$query().update(payload);
}
```

---

## Coding Standards

### TypeScript

- **Strict mode**: Always enable (tsconfig.json: `"strict": true`)
- **Explicit types**: Avoid `any` unless absolutely necessary
- **Interfaces over types**: For public APIs
- **Enums for constants**: Use for status values, field types

```typescript
// ✅ Good
interface Venue {
  id: string;
  name: string;
  created_at: string;
}

// ❌ Avoid
interface Venue {
  id: any;
  name: any;
}
```

### Error Handling

- **Use AppError for domain errors**: Venues not found, validation failures
- **Let middleware handle all errors**: Never `console.error` directly
- **Include context in logs**: Request ID, user info, operation

```typescript
// ✅ Good
if (!found) {
  throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');
}

// ❌ Avoid
if (!found) {
  console.error('Venue missing');
  res.status(500).json({ error: 'Server error' });
}
```

### Validation

- **Use Zod schemas**: For all input validation
- **Define once, reuse everywhere**: Keep schemas in central location
- **Validate at entry point**: In controller before service

```typescript
// ✅ Good - validates and types
const schema = z.object({
  name: z.string().min(1).max(255),
  location: GeometrySchema,
});

type CreateVenueInput = z.infer<typeof schema>;

export async function create(data: unknown) {
  const validated = schema.parse(data); // Throws if invalid
  // validated is now type-safe
}

// ❌ Avoid
export async function create(data: any) {
  if (typeof data.name !== 'string') {
    throw new Error('name must be string');
  }
}
```

### Logging

- **Use logger passed in request**: Via `req.logger`
- **Include relevant context**: IDs, action, operation duration
- **Don't log sensitive data**: Passwords, tokens, personal info

```typescript
// ✅ Good
req.logger.info('Venue created', {
  venueId: venue.id,
  duration: Date.now() - start,
});

// ❌ Avoid
console.log('Venue created:', venue); // Might contain sensitive data
req.logger.info('Error:', error.password); // Never log passwords
```

### Testing

- **Write tests as you code**: Don't leave it for later
- **Test happy path + edge cases**: Success and failures
- **Use descriptive test names**: What is being tested and expected

```typescript
// ✅ Good
test('creates venue with valid data', async () => {
  const res = await request(app).post('/api/venues').send(validData);
  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
});

test('returns 400 for invalid coordinates', async () => {
  const res = await request(app).post('/api/venues').send({
    ...validData,
    location: { type: 'Point', coordinates: [999, 999] }, // Out of bounds
  });
  expect(res.status).toBe(400);
});

// ❌ Avoid
test('venue test', async () => {
  // Unclear what's being tested
  const res = await request(app).post('/api/venues').send(data);
  expect(res).toBeDefined();
});
```

---

## Database Patterns

### Creating Models

Use Objection.js for ORM:

```typescript
import { Model } from 'objection';

export class Venue extends Model {
  static tableName = 'venues';

  id!: string;
  name!: string;
  location!: GeoJSON.Point;
  created_at!: string;
  updated_at!: string;

  static jsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      location: { type: 'object' },
    },
  };

  static relationMappings = {
    pitches: {
      relation: Model.HasManyRelation,
      modelClass: Pitch,
      join: {
        from: 'venues.id',
        to: 'pitches.venue_id',
      },
    },
  };
}
```

### Queries with Relations

```typescript
// ✅ Load relations efficiently
const venue = await Venue.query()
  .findById(id)
  .withGraphFetched('pitches')
  .withGraphFetched('pitches.sessions');

// ❌ N+1 queries (slow)
const venue = await Venue.query().findById(id);
const pitches = await Pitch.query().where('venue_id', id);
for (const pitch of pitches) {
  pitch.sessions = await Session.query().where('pitch_id', pitch.id);
}
```

### Transactions

```typescript
import { getKnex } from '../data/knex';

export async function createWithPitches(venueData: any, pitchesData: any[]) {
  const trx = await getKnex().transaction();
  
  try {
    const venue = await Venue.query(trx).insert(venueData);
    const pitches = await Pitch.query(trx).insert(
      pitchesData.map(p => ({ ...p, venue_id: venue.id }))
    );
    await trx.commit();
    return { venue, pitches };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

---

## API Design Patterns

### Pagination

Always use cursor-based pagination for list endpoints:

```typescript
GET /api/venues?limit=50&cursor=abc123

// Response
{
  "data": [{ ...venue1 }, { ...venue2 }],
  "next_cursor": "def456",
  "has_more": true
}
```

### Versioning

Use `If-Match` header for optimistic concurrency control:

```typescript
PUT /api/venues/123
If-Match: version_token_abc123

// If stale: 409 Conflict
// If valid: 200 OK with updated resource
```

### Error Responses

Always use consistent error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

---

## Performance Guidelines

### Database

- **Use indexes**: Add indexes on frequently queried columns
- **Eager load relations**: Use `withGraphFetched()` to avoid N+1
- **Limit result sets**: Cursor pagination with max 50 items
- **Review query plans**: Use `EXPLAIN ANALYZE` for slow queries

```bash
# Check query performance
docker exec plottr_postgres psql -U postgres -d plottr -c "EXPLAIN ANALYZE SELECT * FROM venues LIMIT 50;"
```

### Caching

- **Cache rarely changes**: Use Cache-Control headers for static data
- **Vary on parameters**: Different users might need different data
- **ETags for invalidation**: Return ETag and check If-None-Match

```typescript
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
res.set('ETag', `W/"${hash(data)}"`);
```

---

## Security Practices

### Input Validation

- **Always validate at entry**: In controller before service
- **Use Zod schemas**: Type-safe validation
- **Length limits**: names ≤255, descriptions ≤1000
- **Format validation**: GeoJSON, emails, URLs

### Authentication

- **Check AUTH_REQUIRED**: Toggle auth based on environment
- **Attach user to request**: Via `req.user`
- **Log auth failures**: For security audit

```typescript
if (process.env.AUTH_REQUIRED === 'true') {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization' });
  }
  // Validate token
}
```

### Rate Limiting

- **Configured per endpoint**: `/api` stricter than `/health`
- **Skip in test**: `NODE_ENV === 'test'`
- **Return 429**: When limit exceeded

---

## Common Tasks

### Adding a New Endpoint

1. **Create Zod schema** in `src/lib/schemas/` or top of file
2. **Create controller** in `src/controllers/resource.controller.ts`
3. **Create route** in `src/routes/resource.routes.ts`
4. **Add test** in `tests/integration/resource.test.ts`
5. **Update OpenAPI** in `openapi/plottr.yaml`
6. **Generate types**: `npm run gen:types`
7. **Test**: `npm test`

### Fixing a Bug

1. **Write test** that reproduces the bug
2. **Fix code** to make test pass
3. **Run full suite**: `npm test` (all should pass)
4. **Commit**: Include test in same commit

### Reviewing Code

- **Check types**: `npm run check:types`
- **Run tests**: `npm test`
- **Check error handling**: All errors should be caught
- **Check logging**: Important operations logged with context
- **Check validation**: Input validated before use

---

## Debugging Tips

### Enable Debug Logging

```bash
LOG_LEVEL=DEBUG npm run dev
```

### Check Database State

```bash
# Connect to test database
docker exec -it plottr_postgres psql -U postgres -d plottr_test

# Useful queries
SELECT * FROM venues LIMIT 5;
SELECT * FROM knex_migrations WHERE batch > 0 ORDER BY batch DESC;
```

### Test Against Real API

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Make requests
curl -H "Authorization: Bearer test-token" http://localhost:3000/api/venues
curl http://localhost:3000/health
```

### Inspect Request/Response

In Thunder Client or Postman:
- Check request headers (including x-request-id)
- Check response headers (including x-request-id for correlation)
- Look at response body for error details

---

## Git Workflow

### Branch Naming

- Feature: `feature/add-pagination`
- Bug fix: `fix/cors-headers`
- Docs: `docs/update-readme`

### Commit Messages

```
feat: add cursor pagination to venues list

- Implement cursor-based pagination in VenuesService
- Add next_cursor and has_more to response
- Add 13 tests for pagination behavior
```

### Pull Request

1. Create feature branch
2. Write tests + code
3. Verify `npm test` passes
4. Push and create PR
5. Wait for CI to pass
6. Request code review
7. Merge when approved

---

## Resources

- **Objection.js**: https://vincit.github.io/objection.js/
- **Express.js**: https://expressjs.com/
- **Zod**: https://zod.dev/
- **Jest**: https://jestjs.io/
- **PostGIS**: https://postgis.net/

---

**Questions?** Check the issues or contact the team. Happy coding! 🚀
