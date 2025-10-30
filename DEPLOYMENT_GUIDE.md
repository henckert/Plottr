# Plottr Deployment Guide

## Quick Review Options for Your Partner

### Option 1: Vercel Deployment (Recommended - 5 minutes) ✅

**Easiest way to share a live demo:**

1. **Push your code to GitHub:**
   ```bash
   cd C:\Users\jhenc\Plottr
   git push origin feat/editor-ux-overhaul
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository (`henckert/Plottr`)
   - Select the branch: `feat/editor-ux-overhaul`
   - Configure:
     - **Root Directory**: `web`
     - **Build Command**: `npm run build`
     - **Output Directory**: `.next`
   - Add Environment Variables:
     ```
     NEXT_PUBLIC_API_BASE_URL=<your-backend-url>
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
     CLERK_SECRET_KEY=<your-clerk-secret>
     ```
   - Click "Deploy"
   - Share the preview URL with your partner (e.g., `https://plottr-xxx.vercel.app`)

**Note:** You'll also need to deploy the backend separately (see Backend section below).

---

### Option 2: Local Network Sharing (Quick Testing)

If you're on the same network:

1. **Find your local IP:**
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Start the dev server:**
   ```bash
   cd web
   npm run dev
   ```

3. **Share the URL:**
   - Your partner can access: `http://YOUR-IP:3000/layouts/42/editor`
   - Example: `http://192.168.1.100:3000/layouts/42/editor`

**Limitations:** Only works on same Wi-Fi/network.

---

### Option 3: ngrok Tunnel (Remote Access)

Share your local dev server via public URL:

1. **Install ngrok:**
   - Download from [ngrok.com](https://ngrok.com)
   - Or via winget: `winget install ngrok`

2. **Start your dev server:**
   ```bash
   cd C:\Users\jhenc\Plottr\web
   npm run dev
   ```

3. **Create tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Share the URL:**
   - ngrok will give you a URL like: `https://abc123.ngrok.io`
   - Share this with your partner
   - They can access: `https://abc123.ngrok.io/layouts/42/editor`

**Limitations:** Free tier has 2-hour session limits.

---

### Option 4: Build and Share ZIP

Package the built app for manual deployment:

1. **Build the frontend:**
   ```bash
   cd web
   npm run build
   ```

2. **Create deployment package:**
   ```bash
   # The built files are in web/.next
   # Package web/, web/.next, web/public, web/package.json
   ```

3. **Your partner needs to:**
   ```bash
   npm install
   npm start
   ```

**Not recommended:** Requires your partner to have Node.js and run commands.

---

## Backend Deployment

Your backend (Express API) also needs to be deployed. Options:

### Railway (Recommended for Express)
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Set root directory to `./` (backend is at root)
4. Add environment variables:
   ```
   DATABASE_URL=<your-postgres-url>
   PORT=3001
   CLERK_SECRET_KEY=<your-clerk-secret>
   MAPBOX_TOKEN=<optional>
   ```
4. Deploy and get your backend URL (e.g., `https://plottr-api.railway.app`)

### Render.com
- Similar to Railway
- Free tier available
- Configure as "Web Service"

### Heroku
- Traditional PaaS
- Requires Heroku Postgres add-on for database

---

## Recommended Setup for Partner Review

**Best approach for professional review:**

1. **Deploy Backend to Railway:** [railway.app](https://railway.app)
   - Takes 5 minutes
   - Free tier includes Postgres database
   - Get API URL (e.g., `https://plottr-production.railway.app`)

2. **Deploy Frontend to Vercel:** [vercel.com](https://vercel.com)
   - Takes 5 minutes
   - Set `NEXT_PUBLIC_API_BASE_URL` to Railway API URL
   - Get preview URL (e.g., `https://plottr-editor.vercel.app`)

3. **Share Link:**
   - Send your partner: `https://plottr-editor.vercel.app/layouts/42/editor`
   - Works on any device, anywhere
   - Auto-updates when you push to GitHub

**Total time:** ~15 minutes for full deployment

---

## Quick Deployment Commands

```bash
# 1. Commit and push your changes
git add -A
git commit -m "feat: editor UX overhaul - draggable panels, search, rural mode"
git push origin feat/editor-ux-overhaul

# 2. Deploy to Vercel (install Vercel CLI first)
npm i -g vercel
cd web
vercel --prod

# 3. Share the deployment URL with your partner
```

---

## Current Branch Status

You're on branch: `feat/editor-ux-overhaul`

Recent commits:
- `9e89628` - fix(editor): add rural opacity to store, fix geocoding search, add panel toggle, fix map centering
- `1923c3f` - fix(editor): correct draggable panel positioning
- `6b8b3ce` - feat(editor): add draggable panels, dismissible RuralMode, and location search bar
- Plus 6 more commits with editor improvements

**Ready to deploy!** ✅

---

## Environment Variables Needed

### Frontend (Vercel)
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Backend (Railway)
```
DATABASE_URL=postgresql://...
PORT=3001
CLERK_SECRET_KEY=sk_test_...
MAPBOX_TOKEN=pk.ey... (optional)
AUTH_REQUIRED=true
NODE_ENV=production
```

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **ngrok Docs:** https://ngrok.com/docs

The easiest path: **Vercel (frontend) + Railway (backend)** = Live demo in 15 minutes! 🚀
