# TASK 4.2 - Troubleshooting Session Summary

**Date**: October 22, 2025  
**Duration**: ~2 hours  
**Final Status**: ✅ SERVERS RUNNING, AWAITING WEBGL TEST

---

## Issues Encountered & Solutions

### 1. ❌ Backend Not Running → ✅ FIXED
**Problem**: "Failed to load zones" error  
**Cause**: Express API server not started  
**Solution**:
- Started Docker PostgreSQL: `docker compose up -d`
- Started backend: `$env:PORT=3001; npm run dev` (in separate PowerShell window)

---

### 2. ❌ CORS Blocked → ✅ FIXED
**Problem**: Browser blocked frontend→backend requests  
**Cause**: Missing CORS middleware  
**Solution**:
```bash
npm install cors @types/cors
```
```typescript
// src/app.ts
import cors from 'cors';
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
```

---

### 3. ❌ Limit Validation Error → ✅ FIXED
**Problem**: "Request failed with status code 400"  
**Cause**: Frontend requested `limit=500`, backend max is `100`  
**Solution**:
```typescript
// web/src/hooks/useZones.ts
limit: params?.limit || 100, // Backend max is 100

// web/src/app/map-test/page.tsx
useZones({ layoutId, limit: 100 })
```

---

### 4. ❌ Frontend Keeps Exiting → ✅ WORKAROUND
**Problem**: `npm run dev` starts then immediately exits in VS Code terminal  
**Cause**: Unknown (terminal integration issue?)  
**Solution**: Started in separate PowerShell window:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
```

---

### 5. ⏳ MapLibre Initialization Failing → PENDING TEST
**Problem**: Map shows "Failed to Initialize" error  
**Possible Cause**: VS Code Simple Browser may not support WebGL  
**Diagnostic Added**:
- Error logging in MapCanvas.tsx
- WebGL test page at `/webgl-test.html`
- Dimension checks before map init

**Next Step**: Check WebGL test page or open in Chrome/Edge

---

## Current Infrastructure State

### ✅ Running Services:

| Service | Port | Status | Window |
|---------|------|--------|--------|
| PostgreSQL | 5432 | ✅ Running | Docker container |
| Backend API | 3001 | ✅ Running | PowerShell window (minimized) |
| Frontend | 3000 | ✅ Running | PowerShell window (normal) |

### ✅ API Verification:

```powershell
PS> Invoke-RestMethod -Uri "http://localhost:3001/api/zones?layout_id=15&limit=100"

# Returns:
{
  "data": [
    {
      "id": 22,
      "name": "West Training Zone",
      "zone_type": "training_zone",
      "boundary": { "type": "Polygon", "coordinates": [...] }
    },
    {
      "id": 21,
      "name": "North Goal Area",
      "zone_type": "goal_area",
      "boundary": { "type": "Polygon", "coordinates": [...] }
    },
    {
      "id": 20,
      "name": "Main Pitch",
      "zone_type": "pitch",
      "boundary": { "type": "Polygon", "coordinates": [...] }
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

### ✅ CORS Verification:

```powershell
PS> $response = Invoke-WebRequest -Uri "http://localhost:3001/api/zones?layout_id=15" -Headers @{'Origin'='http://localhost:3000'}
PS> $response.Headers['Access-Control-Allow-Origin']

http://localhost:3000 ✅
```

---

## Test URLs

### Simple Browser (VS Code):
- **Map Test**: http://localhost:3000/map-test?layoutId=15
- **WebGL Test**: http://localhost:3000/webgl-test.html

### Regular Browser (Chrome/Edge - if WebGL fails):
- Open: http://localhost:3000/map-test?layoutId=15
- Should display map with 3 colored zones

---

## Files Modified

### Backend:
1. **src/app.ts**
   - Added `import cors from 'cors'`
   - Added CORS middleware before routes

### Frontend:
2. **web/src/hooks/useZones.ts**
   - Changed default limit from 500 to 100

3. **web/src/app/map-test/page.tsx**
   - Changed `useZones({ layoutId, limit: 500 })` to `limit: 100`

4. **web/src/components/editor/MapCanvas.tsx**
   - Added try-catch around map initialization
   - Added console logging for debugging
   - Added error event handlers
   - Added dimension checks before init

5. **web/public/webgl-test.html** (NEW)
   - Diagnostic page to test WebGL support

---

## Troubleshooting Commands

### Check if services are running:
```powershell
# Backend (port 3001)
Test-NetConnection localhost -Port 3001

# Frontend (port 3000)
Test-NetConnection localhost -Port 3000

# PostgreSQL (port 5432)
docker ps --filter "name=postgres"
```

### Restart services:
```powershell
# Backend
cd C:\Users\jhenc\Plottr
$env:PORT=3001
npm run dev

# Frontend
cd C:\Users\jhenc\Plottr\web
npm run dev

# PostgreSQL
docker compose up -d
```

### Test API directly:
```powershell
# Zones endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/zones?layout_id=15&limit=10"

# Health check
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

---

## Next Steps

### 1. WebGL Test (IMMEDIATE):
- Check Simple Browser tab at `/webgl-test.html`
- **If green**: WebGL works, different map issue (check console F12)
- **If red**: WebGL not supported, use Chrome/Edge instead

### 2. Map Test in Chrome/Edge (IF WEBGL FAILS):
- Open Chrome or Edge
- Navigate to: http://localhost:3000/map-test?layoutId=15
- Should see:
  - Gray OSM basemap
  - 3 colored zones (green, yellow, blue)
  - Clickable zones with red outline on selection
  - Zone details in sidebar

### 3. Complete TASK 4.2 Verification:
- [ ] Zones render on map with correct colors
- [ ] Click zone → outline turns red
- [ ] Sidebar updates with zone details
- [ ] No console errors (F12)
- [ ] Loading states work correctly
- [ ] API status shows "Ready"

### 4. Git Commit (AFTER VERIFICATION):
```bash
git add .
git commit -m "feat(frontend): TASK 4.2 Complete - Map integration with API

- Added CORS middleware to backend
- Integrated useZones() React Query hook
- Created type-safe GeoJSON mappers
- Added MapErrorBoundary component
- Fixed limit validation (100 max)
- Added error logging and diagnostics

Files modified:
- src/app.ts (CORS)
- web/src/hooks/useZones.ts (limit fix)
- web/src/app/map-test/page.tsx (limit fix)
- web/src/components/editor/MapCanvas.tsx (error handling)
- web/src/lib/map/mappers.ts (NEW)
- web/src/components/editor/MapErrorBoundary.tsx (NEW)

Testing: 3 zones render correctly for layoutId=15
Status: Ready for TASK 4.3 (Polygon Drawing Tools)"
```

---

## Known Issues

### 1. Frontend Terminal Exits in VS Code
**Workaround**: Run in separate PowerShell window  
**Impact**: Minor annoyance, doesn't affect functionality  
**Future Fix**: Investigate VS Code terminal integration

### 2. WebGL Support Unknown in Simple Browser
**Workaround**: Test in Chrome/Edge if Simple Browser fails  
**Impact**: Cannot use Simple Browser for map testing  
**Future Fix**: Document requirement for external browser

---

## Success Criteria Status

| Requirement | Status | Notes |
|------------|--------|-------|
| Backend running | ✅ COMPLETE | Port 3001 with CORS |
| Frontend running | ✅ COMPLETE | Port 3000 |
| API returns zones | ✅ COMPLETE | 3 zones for layoutId=15 |
| CORS configured | ✅ COMPLETE | Headers present |
| Limit fixed | ✅ COMPLETE | 100 max |
| Map initialization | ⏳ TESTING | Awaiting WebGL test |
| Zones render | ⏳ PENDING | Awaiting map init |
| Click interaction | ⏳ PENDING | Awaiting map init |
| No console errors | ⏳ PENDING | Awaiting verification |

---

## Estimated Time to Complete

- **If WebGL works in Simple Browser**: 5 minutes (verify + commit)
- **If need Chrome/Edge**: 10 minutes (open browser + verify + commit)
- **Total time spent so far**: ~2 hours (troubleshooting infrastructure)

---

**Current State**: ✅ All infrastructure running  
**Blocking Issue**: WebGL support verification  
**Next Action**: Check http://localhost:3000/webgl-test.html  
**Ready For**: Final verification + TASK 4.3
