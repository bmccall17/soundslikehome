# Deployment Troubleshooting Guide

## "Serverless Function has crashed" Error

This error typically occurs due to Vercel's serverless environment limitations. Here's how to fix it:

### ✅ Quick Fix - Files to Update on GitHub

**1. Replace your GitHub repository with these updated files:**

- `api/index.js` (new file - serverless entry point)
- `vercel.json` (updated configuration)
- `package.json` (updated dependencies)

### ✅ Testing Deployment Completeness

**Check if all files uploaded to GitHub:**

1. Visit your GitHub repository
2. Verify these files are present:
   - `api/index.js` (new serverless function)
   - `vercel.json` 
   - `package.json`
   - `index.html`
   - `admin.html`
   - `app.js`
   - `admin.js`
   - `styles.css`
   - All other files from your local project

**Check Vercel deployment:**

1. Go to [vercel.com](https://vercel.com) → Your Project
2. Click on "Deployments" tab
3. Look for:
   - ✅ Green checkmark = successful deployment
   - ❌ Red X = failed deployment
   - ⏳ Yellow circle = still building

**View deployment logs:**
1. Click on your latest deployment
2. Click "View Function Logs" 
3. Look for error messages

### ✅ Common Issues & Solutions

**Issue 1: File System Operations**
- ❌ **Problem:** Original `server.js` tries to read/write files
- ✅ **Solution:** Use `api/index.js` with in-memory storage

**Issue 2: Wrong Entry Point**
- ❌ **Problem:** Vercel looking for `server.js` 
- ✅ **Solution:** Use `api/index.js` as serverless function

**Issue 3: Missing Dependencies**
- ❌ **Problem:** `package.json` missing or wrong format
- ✅ **Solution:** Use updated `package.json`

**Issue 4: SSL Certificate Errors**
- ❌ **Problem:** Code trying to read SSL certificates in production
- ✅ **Solution:** `api/index.js` doesn't use SSL (Vercel handles HTTPS)

### ✅ Environment Variables Check

In Vercel dashboard → Settings → Environment Variables:

```
NODE_ENV=production
SESSION_SECRET=your-random-32-char-string
ADMIN_PASSWORD=your-secure-password
```

### ✅ Testing Steps After Fix

1. **Update GitHub** with new files
2. **Redeploy on Vercel** (should auto-deploy from GitHub)
3. **Test endpoints:**
   - `https://your-app.vercel.app/` → Should show main app
   - `https://your-app.vercel.app/api/health` → Should show `{"status":"OK"}`
   - `https://your-app.vercel.app/admin` → Should show admin login

### ✅ Manual Deployment Test

If GitHub auto-deploy isn't working:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy directly:**
   ```bash
   cd your-project-folder
   vercel --prod
   ```

### ✅ Vercel Logs

**View real-time logs:**
1. Vercel Dashboard → Your Project → Functions
2. Click on any function 
3. Click "View Logs"
4. Look for error messages

**Common log errors:**
- `Cannot find module` → Missing dependency
- `ENOENT: no such file` → File system issue (use in-memory storage)
- `Permission denied` → File permission issue (use in-memory storage)

### ✅ Alternative: Simple Static Version

If serverless functions keep failing, create a simplified version:

**Remove complex features temporarily:**
- File uploads (just show UI)
- Admin panel (just show login form)
- Database operations (use mock data)

**Keep working features:**
- Main UI
- Audio recording interface
- Bubble animations
- Basic prompt display

### 🔧 Need More Help?

**Check these resources:**
- [Vercel Function Logs](https://vercel.com/docs/observability/runtime-logs)
- [Node.js on Vercel](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Troubleshooting](https://vercel.com/docs/troubleshooting)

**Contact Info:**
- Create GitHub issue with error logs
- Include Vercel deployment URL
- Share any console errors from browser