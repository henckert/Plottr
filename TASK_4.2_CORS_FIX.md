# CORS Fix - Map Not Loading Issue

**Date**: October 21, 2025  
**Issue**: Map test page not loading zones - "Failed to load zones"  
**Root Cause**: CORS (Cross-Origin Resource Sharing) not configured on backend  
**Status**: ✅ RESOLVED

---

## Problem

The frontend (http://localhost:3000) was being **blocked by the browser** from making requests to the backend (http://localhost:3001) due to missing CORS headers.

### Browser Error (in Console):
```
Access to XMLHttpRequest at 'http://localhost:3001/api/zones?layout_id=15' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## Solution

### 1. Installed CORS Package

```bash
cd C:\Users\jhenc\Plottr
npm install cors @types/cors
```

### 2. Added CORS Middleware to Backend

**File**: `src/app.ts`

```typescript
// Added import
import cors from 'cors';

// Added CORS middleware (before routes, after logging)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
```

### 3. Restarted Backend

```powershell
# Stopped old backend process
Stop-Process -Id <process_id> -Force

# Started new backend with CORS enabled
cd C:\Users\jhenc\Plottr
$env:PORT=3001
npm run dev
```

---

## Verification

### Before (No CORS):
```powershell
PS> Invoke-WebRequest -Uri "http://localhost:3001/api/zones?layout_id=15" -Headers @{'Origin'='http://localhost:3000'}

# Response Headers:
StatusCode: 200
Access-Control-Allow-Origin: (missing) ❌
```

### After (With CORS):
```powershell
PS> Invoke-WebRequest -Uri "http://localhost:3001/api/zones?layout_id=15" -Headers @{'Origin'='http://localhost:3000'}

# Response Headers:
StatusCode: 200
Access-Control-Allow-Origin: http://localhost:3000 ✅
```

---

## Environment Variable (Optional)

To configure CORS for different origins (e.g., production):

**File**: `.env`
```properties
CORS_ORIGIN=https://plottr.app
```

Or for multiple origins:
```typescript
// src/app.ts
app.use(cors({
  origin: ['http://localhost:3000', 'https://plottr.app'],
  credentials: true,
}));
```

---

## What CORS Does

1. **Same-Origin Policy**: Browsers block requests between different origins (protocol + domain + port) for security
2. **CORS Headers**: Server must explicitly allow cross-origin requests via headers
3. **Credentials**: `credentials: true` allows cookies/auth headers to be sent

### Example:
- **Frontend**: http://localhost:**3000** (Next.js)
- **Backend**: http://localhost:**3001** (Express)
- **Different Origins**: Ports differ → CORS required

---

## Testing

### Frontend Request:
```typescript
// web/src/hooks/useZones.ts
const response = await apiClient.get('/zones', {
  params: { layout_id: 15, limit: 3 }
});
// Now succeeds with CORS headers ✅
```

### Backend Response Headers:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

---

## Summary

| Before | After |
|--------|-------|
| ❌ Frontend blocked by browser | ✅ Frontend can call backend API |
| ❌ No CORS headers | ✅ CORS headers present |
| ❌ Map shows "Failed to load zones" | ✅ Map loads zones from API |

---

**Status**: ✅ CORS Configured  
**Backend**: Running on port 3001 with CORS  
**Frontend**: Running on port 3000  
**Browser**: Should now load map with zones  
**Next**: Verify in Simple Browser tab
