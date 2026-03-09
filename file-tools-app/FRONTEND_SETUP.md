# Frontend Setup & Deployment Guide

## What Was Updated

Your `public/script.js` has been updated to support cloud deployment. The key change is the **API_URL** configuration at the top of the file.

### Changes Made:
```javascript
// ===== API CONFIGURATION =====
// CHANGE THIS to your Render.com backend URL after deployment
const API_URL = 'https://file-tools-app-backend.onrender.com';
// For LOCAL TESTING, use: const API_URL = 'http://localhost:3001';
```

All API endpoints in script.js that previously used `/api/...` paths now use:
- `${API_URL}/api/auth/profile` ✅
- `${API_URL}/api/auth/login` ✅
- `${API_URL}/api/auth/register` ✅
- `${API_URL}/api/tools/upload` ✅
- `${API_URL}/api/tools/job-status/{jobId}` ✅

---

## 🧪 Testing Locally

### Step 1: Start Your Backend
Make sure your Node.js server is running:
```bash
cd file-tools-app
npm install
npm start
```
Your backend should be running on `http://localhost:3001`

### Step 2: Update script.js (If Testing Locally)
In `public/script.js`, change the API_URL:
```javascript
const API_URL = 'http://localhost:3001';  // For local testing
```

### Step 3: Open Your Frontend
- Open `public/index.html` in your browser
- OR if you have a local server like Python: `python -m http.server 8000`
- Visit `http://localhost:8000`

### Step 4: Test Features
1. **Register/Login**: Try creating a free account
2. **Upload Files**: Select a PDF and upload
3. **Check Console**: Press F12, go to Console tab
   - You should see: `Backend API URL: http://localhost:3001`
   - No CORS errors should appear

---

## 🚀 Deploying to Render.com

### Step 1: Prepare Your Code
Before pushing to Render, make sure script.js has the correct URL:
```javascript
const API_URL = 'https://file-tools-app-backend.onrender.com';
// Update this to YOUR actual Render.com backend URL after deployment
```

### Step 2: Push to GitHub
```bash
git add .
git commit -m "Update frontend API URL for production"
git push origin main
```

### Step 3: Deploy Backend First
- Go to [Render.com](https://render.com)
- Deploy your Node.js backend (see RENDER_DEPLOYMENT_GUIDE.md)
- Copy your backend URL (e.g., `https://your-app-name.onrender.com`)

### Step 4: Update Frontend API_URL
Once your backend is deployed on Render, update script.js:
```javascript
const API_URL = 'https://your-app-name.onrender.com';  // Your actual Render URL
```

Then commit and push:
```bash
git add public/script.js
git commit -m "Update API URL to production backend"
git push origin main
```

### Step 5: Deploy Frontend
Option A: Deploy to Render as Static Site
- New → Static Site
- Connect your GitHub repo
- Build: Leave empty (HTML/CSS/JS don't need building)
- Publish directory: `file-tools-app/public`

Option B: Serve from Same Render Service
- If deploying your Node backend on Render, serve static files from there
- The backend's `server.js` already has: `app.use(express.static('public'));`
- Your frontend will be available at: `https://your-app-name.onrender.com`

---

## ✅ Testing After Deployment

### Browser Console Check
1. Visit your deployed frontend
2. Press F12 → Console tab
3. You should see:
   ```
   File Tools frontend loaded successfully
   Backend API URL: https://your-app-name.onrender.com
   ```

### Functional Tests
1. **Guest Access**: Try uploading without login → Should work (3 files/day limit)
2. **Free Account**: Register → Login → Upload → Should work (20 files/day)
3. **File Processing**: Check if files are processed and downloadable
4. **Error Handling**: Upload without auth → Should show limits properly

---

## 🔧 Troubleshooting

### CORS Errors in Console
**Problem**: `No 'Access-Control-Allow-Origin' header`
- Check that your backend has CORS enabled in `server.js`
- Verify the API_URL matches your backend domain exactly

### Files Not Uploading
**Problem**: 404 or 500 errors in Network tab
- Check browser DevTools → Network tab
- Verify API_URL is correct
- Check backend logs on Render.com

### Auth Not Working
**Problem**: Login/register shows errors
- Clear browser localStorage: Press F12 → Application → Local Storage → Clear
- Try again
- Check browser Console for detailed error messages

### Button to Update API_URL
If you need to frequently switch between local and production:
```javascript
function switchAPIMode(mode) {
  if (mode === 'local') {
    const API_URL = 'http://localhost:3001';
  } else if (mode === 'production') {
    const API_URL = 'https://your-app-name.onrender.com';
  }
  location.reload();
}
```
Add this to script.js if you want to easily switch modes.

---

## 📋 Checklist Before Going Live

- [ ] Backend deployed to Render.com ✓
- [ ] Environment variables set (MONGODB_URI, REDIS_URL, JWT_SECRET)
- [ ] API_URL in script.js matches your backend domain
- [ ] Tested locally with `localhost:3001`
- [ ] Tested file upload workflow
- [ ] Tested authentication (register, login, logout)
- [ ] Checked browser console for no errors
- [ ] Verified CORS is working
- [ ] Tested on different browsers (Chrome, Firefox, Safari)

---

## 🎯 Summary

Your frontend is now ready for cloud deployment! The key points:
1. **API_URL** at the top of script.js controls where all API calls go
2. Keep it as `localhost:3001` while testing locally
3. Change it to `https://your-app-name.onrender.com` for production
4. All fetch calls automatically use this URL
5. Console logs will show you which backend is being used

Good luck! 🚀
