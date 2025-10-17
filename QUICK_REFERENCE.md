# Plottr Quick Reference Guide

## 🚀 Quick Start (Copy & Paste)

### Backend Setup
```bash
# Install dependencies
npm install

# Start PostgreSQL with PostGIS
docker compose up -d

# Run database migrations
npm run db:migrate

# Start backend server
npm run dev

# Run tests (in another terminal)
npm test
```

Backend is ready on **http://localhost:3001**

### Frontend Setup
```bash
# In new terminal
cd web

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

Frontend is ready on **http://localhost:3000**

---

## 📋 Common Commands

### Backend

```bash
# Development
npm run dev              # Start dev server
npm test                # Run all tests
npm run build           # Build for production
npm run type-check      # TypeScript validation
npm run lint            # ESLint

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed test data
npm run db:reset        # Reset database

# Health Checks
curl http://localhost:3001/health      # Simple health
curl http://localhost:3001/healthz     # Detailed health
```

### Frontend

```bash
# Development
npm run dev             # Start dev server
npm run type-check      # TypeScript validation
npm run lint            # ESLint check
npm run build           # Build for production
npm start               # Start production server
```

---

## 📚 Documentation Map

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Step-by-step setup | 10 min |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Architecture patterns | 15 min |
| [CI_CD_PIPELINE.md](CI_CD_PIPELINE.md) | CI/CD configuration | 10 min |
| [TASK_14_OFFLINE_CACHING.md](TASK_14_OFFLINE_CACHING.md) | Offline/PWA features | 15 min |
| [MVP_STATUS_REPORT.md](MVP_STATUS_REPORT.md) | Complete project overview | 20 min |
| [web/README.md](web/README.md) | Frontend setup | 10 min |

---

## 🔍 API Endpoints

### Venues
```
GET    /api/venues                 # List with pagination
POST   /api/venues                 # Create new
GET    /api/venues/:id             # Get detail
PUT    /api/venues/:id             # Update (requires If-Match header)
```

### Pitches
```
GET    /api/pitches                # List with pagination
POST   /api/pitches                # Create new
GET    /api/pitches/:id            # Get detail
```

### Sessions
```
GET    /api/sessions               # List with pagination
POST   /api/sessions               # Create new
GET    /api/sessions/:id           # Get detail
```

### Health
```
GET    /health                     # Simple status
GET    /healthz                    # Detailed status
```

### OpenAPI
```
GET    /openapi.json               # OpenAPI 3.0 spec
```

---

## 🖥️ Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Venue listing (paginated) |
| `/venues/[id]` | Venue detail with pitches |
| `/pitches/[id]` | Pitch detail with map |
| `/sessions/[id]` | Session detail |

---

## 🧪 Testing

### Run Tests
```bash
npm test                          # All tests
npm test -- tests/unit           # Unit tests only
npm test -- tests/integration    # Integration tests only
npm test -- --watch              # Watch mode
```

### Test Coverage
- ✅ 158/158 tests passing
- ✅ CRUD operations
- ✅ Geospatial validation
- ✅ Pagination
- ✅ Security
- ✅ Observability

---

## 🔐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plottr
DB_USER=plottr
DB_PASSWORD=password
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=15
RATE_LIMIT_PUBLIC_MAX=100
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## 🧠 Key Features

### Backend
✅ Full CRUD API  
✅ Geospatial database (PostGIS)  
✅ Cursor pagination  
✅ Security headers (Helmet)  
✅ Rate limiting  
✅ Input validation (Zod)  
✅ Structured logging  
✅ Request correlation IDs  
✅ Health checks  
✅ OpenAPI spec  

### Frontend
✅ Modern React UI  
✅ Responsive design (Tailwind)  
✅ TypeScript strict mode  
✅ MapLibre geospatial maps  
✅ Deep linking  
✅ Offline support (PWA)  
✅ Service workers  
✅ IndexedDB caching  

### Operations
✅ CI/CD (GitHub Actions)  
✅ Docker containerization  
✅ Database migrations  
✅ npm scripts  
✅ TypeScript throughout  
✅ Full documentation  

---

## 🛠️ Troubleshooting

### "Cannot find module 'postgres'"
```bash
npm install
```

### "Port already in use"
```bash
# Find process on port 3001
lsof -i :3001
# Kill it or use different port
PORT=3002 npm run dev
```

### "Service Worker not registering"
```
DevTools → Application → Clear storage
Reload page
```

### "Offline cache empty"
```
1. Visit some pages
2. DevTools → Application → IndexedDB
3. Should see venues, pitches, sessions
```

### "Tests failing"
```bash
# Reset database
npm run db:reset

# Run tests again
npm test
```

---

## 📊 Git Commands

```bash
# View changes
git status
git log --oneline -10

# Commit changes
git add .
git commit -m "feat: description"
git push origin main

# View branches
git branch -a
git checkout -b feature/name
```

---

## 🔗 Useful Links

**Local URLs:**
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Health: http://localhost:3001/health
- OpenAPI: http://localhost:3001/openapi.json

**GitHub:**
- Repository: [henckert/Plottr](https://github.com/henckert/Plottr)
- Current branch: main

**Documentation:**
- [Express.js](https://expressjs.com/)
- [Next.js](https://nextjs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [PostGIS](https://postgis.net/)
- [TypeScript](https://www.typescriptlang.org/)

---

## 🎯 Development Workflow

### 1. Start Services
```bash
docker compose up -d
npm run dev              # Terminal 1 - Backend
cd web && npm run dev    # Terminal 2 - Frontend
```

### 2. Make Changes
```bash
# Edit backend files in src/
# Edit frontend files in web/src/
```

### 3. Test
```bash
npm test                 # Backend tests
npm run type-check       # TypeScript
```

### 4. Commit
```bash
git add .
git commit -m "feat: description"
```

### 5. Deploy
```bash
# Create production build
npm run build
npm start
```

---

## 📱 Testing Offline Mode

1. **Open frontend:** http://localhost:3000
2. **Browse venues:** Click a few venues to cache them
3. **Toggle offline:**
   - DevTools (F12)
   - Application → Service Workers
   - Check "Offline"
4. **Refresh:** Page loads from cache!
5. **Try offline:**
   - Go to venues list (should work)
   - Try new search (will fail gracefully)
6. **Go online:**
   - Uncheck "Offline"
   - Page should refresh automatically

---

## 🎊 What You Have

✅ Production-ready backend API  
✅ Modern React frontend  
✅ Offline PWA support  
✅ Geospatial database  
✅ Security hardened  
✅ 158 tests passing  
✅ Full documentation  
✅ CI/CD automation  
✅ TypeScript throughout  

---

## 🚀 Next Steps

1. **Try it out:** npm run dev (backend) + cd web && npm run dev (frontend)
2. **Test offline:** DevTools toggle offline mode
3. **Browse code:** Read documentation links above
4. **Run tests:** npm test (should see 158/158 ✅)
5. **Deploy:** Follow LOCAL_SETUP.md for production

---

## 💬 Questions?

Refer to the comprehensive documentation:
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Setup issues
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Architecture questions
- [TASK_14_OFFLINE_CACHING.md](TASK_14_OFFLINE_CACHING.md) - Offline features
- [MVP_STATUS_REPORT.md](MVP_STATUS_REPORT.md) - Project overview

---

**Status:** 14/15 Tasks Complete ✅ | Ready for: Production, Testing, or Feature Development
