# Render.com Deployment Guide for File Tools App

**Complete, step-by-step guide to deploy your Node.js backend to Render.com**

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Set Up MongoDB Atlas](#step-1-set-up-mongodb-atlas)
4. [Step 2: Set Up Redis Cloud](#step-2-set-up-redis-cloud)
5. [Step 3: Prepare Your Code](#step-3-prepare-your-code)
6. [Step 4: Push to GitHub](#step-4-push-to-github)
7. [Step 5: Deploy to Render.com](#step-5-deploy-to-rendercom)
8. [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
9. [Step 7: Test Your Deployment](#step-7-test-your-deployment)
10. [Step 8: Connect Frontend](#step-8-connect-frontend)
11. [Troubleshooting](#troubleshooting)
12. [Monitoring & Logs](#monitoring--logs)

---

## Overview

Your **File Tools App** will be deployed across three cloud services:
- **Render.com** - Hosts your Node.js backend (server.js)
- **MongoDB Atlas** - Cloud database for users and application data
- **Redis Cloud** - Cloud cache for job queue and guest tracking

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Render.com (Your Backend)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Node.js Express Server (server.js)                  │   │
│  │  ├── Routes: /api/auth, /api/tools                   │   │
│  │  ├── Middleware: Guest & Usage Limiters              │   │
│  │  ├── Workers: Conversion Job Queue                   │   │
│  │  └── Static Files: public/ (HTML/CSS/JS)             │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                    ↓              │
└─────────┬────────────────────────────────────┬───────────────┘
          ↓                                    ↓
    ┌───────────────┐               ┌──────────────────┐
    │ MongoDB Atlas │               │  Redis Cloud     │
    │ (Users & Data)│               │ (Queue & Cache)  │
    └───────────────┘               └──────────────────┘
```

---

## Prerequisites

Before starting, you'll need:
- [ ] GitHub account with your code pushed
- [ ] Render.com free account
- [ ] MongoDB Atlas free account
- [ ] Redis Cloud free account
- [ ] Node.js installed locally (for testing)

**Total setup time: ~30 minutes**

---

# Step 1: Set Up MongoDB Atlas

MongoDB Atlas is your cloud database for storing users, file conversions, and application data.

### 1.1 Create a MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Click **Sign Up** (or login if you have an account)
3. Create a free account with email

### 1.2 Create a Project

After signing in:
1. Click **Create a Project**
2. Name it: `file-tools-app`
3. Click **Create Project**

### 1.3 Create a Database Cluster

1. Click **Build a Database**
2. Choose **Free** (M0 - Shared Cluster)
3. Select your region (choose closest to Render.com region - see below)
4. Click **Create Cluster** (wait 3-5 minutes for it to build)

### 1.4 Add Database User

1. Go to **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Set username: `filetools`
4. Set password: Create a strong password (save this!)
5. Select role: **Atlas Admin** (for development)
6. Click **Add User**

### 1.5 Get Connection String

1. Go back to **Databases** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Drivers**
4. Copy the connection string that looks like:
   ```
   mongodb+srv://filetools:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=filetools
   ```
5. Replace `PASSWORD` with your actual password
6. Your final URL will look like:
   ```
   mongodb+srv://filetools:your-password-here@cluster0.xxxxx.mongodb.net/file-tools-app?retryWrites=true&w=majority
   ```

**Save this URL** - you'll need it for Render environment variables.

---

# Step 2: Set Up Redis Cloud

Redis Cloud stores your job queue and guest tracking data.

### 2.1 Create a Redis Cloud Account

1. Go to [redis.com/try-free](https://redis.com/try-free)
2. Click **Sign Up** (or login if you have an account)
3. Create a free account

### 2.2 Create a Database

1. After login, click **Create a Database**
2. Choose **Redis Cloud** (your only free option on Free tier)
3. Select your region (should match Render region - see below)
4. Keep name as default or name it: `file-tools-app`
5. Click **Create**
6. Wait for database to be ready (2-3 minutes)

### 2.3 Get Connection URL

1. Click on your database name
2. Look for the **Redis Connection String** (looks like: `redis://:password@host:port`)
3. Or find the details:
   - **Host**: the server address
   - **Port**: usually `6379` or custom
   - **Password**: your Redis password
   - **Username**: `default`

4. Build your connection string:
   ```
   rediss://default:your-password@your-host:your-port
   ```
   (Note: Use `rediss://` with double 's' for secure connection)

**Save this URL** - you'll need it for Render environment variables.

---

# Step 3: Prepare Your Code

### 3.1 Create .env.example File

This file documents what environment variables your app needs (without secrets).

Create `file-tools-app/.env.example`:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# MongoDB Atlas
MONGODB_URI=mongodb+srv://filetools:password@cluster0.xxxxx.mongodb.net/file-tools-app?retryWrites=true&w=majority

# Redis Cloud
REDIS_URL=rediss://default:password@host:port

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-random-secret-key-here-min-32-chars

# File Size Limits (in bytes)
MAX_FILE_SIZE_GUEST=10485760
MAX_FILE_SIZE_FREE=52428800
MAX_FILE_SIZE_PRO=524288000
```

### 3.2 Update .gitignore

Make sure `file-tools-app/.gitignore` contains:
```
node_modules/
.env
.env.local
uploads/
conversions/
*.log
.DS_Store
```

### 3.3 Verify Your Code

Check that your `server.js` uses environment variables:

✅ Already in place:
```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/file-tools-app';
mongoose.connect(MONGODB_URI)

const PORT = process.env.PORT || 3001;
```

✅ Check if you have JWT secret setup in `controllers/authController.js`:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

If not, add it!

### 3.4 Generate JWT Secret

You need a secure random secret. Run this in terminal:
```javascript
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like: `a1b2c3d4e5f6...` (64 characters)

**Save this** - you'll paste it into Render's environment variables.

---

# Step 4: Push to GitHub

Render.com deploys directly from GitHub, so your code must be there.

### 4.1 Initialize Git (if not already done)

```bash
cd file-tools-app
git init
git add .
git commit -m "Initial commit: File Tools App with SaaS auth"
```

### 4.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it: `file-tools-app`
3. Choose **Private** (safer for credentials)
4. Click **Create Repository**

### 4.3 Connect Local Code to GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/file-tools-app.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### 4.4 Verify Files Are on GitHub

1. Go to your repository: `github.com/YOUR_USERNAME/file-tools-app`
2. Verify you see:
   - `server.js` ✓
   - `package.json` ✓
   - `public/` folder with HTML/CSS/JS ✓
   - `.env.example` (but NOT `.env`) ✓
   - All your route, controller, model files ✓

---

# Step 5: Deploy to Render.com

### 5.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Click **Sign Up** (or login)
3. Choose **GitHub** for signup (easier)

### 5.2 Create a New Web Service

1. Go to Dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub account (authorize if needed)
4. Find your repository: `file-tools-app`
5. Click **Connect**

### 5.3 Configure Service Settings

**Name**: `file-tools-app-backend` (or your preference)

**Environment**: `Node`

**Build Command**: Leave empty (uses `npm install` by default)

**Start Command**: `npm start`

**Region**: Choose based on your user location
- **Virginia (US East)**: Default, good for most
- **Germany**: For Europe
- **Singapore**: For Asia

**Plan**: Choose **Free** (generous free tier for testing)

**Auto-Deploy**: Toggle **ON** (redeploys when you push to GitHub)

---

# Step 6: Configure Environment Variables

### 6.1 Add Environment Variables in Render

1. Scroll down in the Render service page to **Environment**
2. Add each variable:

| Key | Value | Example |
|-----|-------|---------|
| `PORT` | 3001 | (Render assigns this, can leave) |
| `NODE_ENV` | `production` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas URL | `mongodb+srv://filetools:xxx@cluster0.xxxxx.mongodb.net/file-tools-app?retryWrites=true&w=majority` |
| `REDIS_URL` | Your Redis Cloud URL | `rediss://default:xxx@host:port` |
| `JWT_SECRET` | Your generated secret | `a1b2c3d4e5f6...` (the 64-char string) |
| `MAX_FILE_SIZE_GUEST` | `10485760` | (10 MB) |
| `MAX_FILE_SIZE_FREE` | `52428800` | (50 MB) |
| `MAX_FILE_SIZE_PRO` | `524288000` | (500 MB) |

### 6.2 Paste Values Carefully

**For MONGODB_URI:**
- Copy from MongoDB Atlas connection string
- Replace `PASSWORD` with your actual password
- Make sure full URL is pasted, no spaces

**For REDIS_URL:**
- Copy from Redis Cloud connection string
- Should start with `rediss://` (double 's')

**For JWT_SECRET:**
- Paste the 64-character string you generated

### 6.3 Click **Deploy**

Render will start building your service. This takes 2-5 minutes.

---

# Step 7: Test Your Deployment

### 7.1 Wait for Build to Complete

In Render Dashboard:
1. Watch the **Logs** tab
2. You should see:
   ```
   npm install
   [success] npm install completed
   npm start
   Connected to MongoDB
   Server is running at http://localhost:3001
   ```

When you see these messages, your backend is running!

### 7.2 Get Your Backend URL

Find the service URL at the top of Render page. It looks like:
```
https://file-tools-app-backend.onrender.com
```

Copy this URL - you'll use it in your frontend.

### 7.3 Test API Health Check

Open this in your browser (replace URL with yours):
```
https://your-service-name.onrender.com/api
```

You should see:
```json
{
  "message": "File Tools API",
  "version": "1.0.0"
}
```

### 7.4 Test Authentication Endpoint

Use a tool like **Postman** or **cURL** to test registration:

```bash
curl -X POST https://your-service-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

You should get a response with a user object and JWT token.

### 7.5 Monitor Logs

In Render Dashboard, click **Logs** to see real-time server logs:
- Connection errors → Fix env variables
- "Cannot find module" → Missing npm dependency
- "Port already in use" → Render handles this automatically

---

# Step 8: Connect Frontend

Now that your backend is deployed, connect your frontend.

### 8.1 Update Frontend API URL

Edit `public/script.js` and update:
```javascript
const API_URL = 'https://your-service-name.onrender.com';
// Replace with your actual Render backend URL
```

### 8.2 Commit and Push

```bash
git add public/script.js
git commit -m "Update API URL to production backend"
git push origin main
```

### 8.3 Frontend Deployment Options

**Option A: Serve from Same Render Service** (Recommended)
- Your `server.js` already serves static files from `public/` folder
- Your frontend is automatically available at: `https://your-service-name.onrender.com`
- Just push code to GitHub and Render redeploys automatically

**Option B: Deploy Frontend Separately**
If you want to separate frontend and backend:
1. Create a new **Static Site** on Render
2. Connect same GitHub repo
3. Set **Publish Directory**: `file-tools-app/public`
4. Update API_URL in script.js to point to your backend service URL

### 8.4 Test Frontend Access

1. Go to `https://your-service-name.onrender.com` in your browser
2. You should see your File Tools App UI
3. Check **Console** (F12):
   ```
   File Tools frontend loaded successfully
   Backend API URL: https://your-service-name.onrender.com
   ```

---

# Step 7: Test Your Deployment

### Complete Feature Testing Checklist

- [ ] **API Health**: Visit `/api` → See version message
- [ ] **Registration**: Create new account through UI
- [ ] **Login**: Login with new account
- [ ] **File Upload**: Upload a PDF as logged-in user
- [ ] **Guest Access**: Logout and try uploading (should limit to 3/day)
- [ ] **Job Status**: Check if conversion job shows progress
- [ ] **Download**: Download converted file
- [ ] **Error Handling**: Various error cases show proper messages

### Test with cURL (Backend Only)

```bash
# Test API health
curl https://your-service.onrender.com/api

# Test registration
curl -X POST https://your-service.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password123"}'

# Test login
curl -X POST https://your-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password123"}'
```

---

# Troubleshooting

## Common Issues & Solutions

### Issue: "Cannot GET /" or 404 error

**Cause**: Frontend static files not being served

**Solution**:
1. Check Render logs for errors
2. Verify `public/` folder is in your GitHub repo
3. Verify `server.js` has: `app.use(express.static(path.join(__dirname, 'public')));`
4. Restart service in Render

### Issue: "CORS errors" in browser console

**Cause**: Backend not allowing requests from frontend

**Solution**:
- Verify `server.js` has CORS headers (already included):
  ```javascript
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    // ... rest of CORS headers
  });
  ```
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)

### Issue: "Cannot connect to MongoDB"

**Cause**: Wrong connection string or IP whitelist

**Solution**:
1. Go to MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allow all IPs - safe for free tier)
3. Verify connection string has correct password
4. Copy Render server IP and add to MongoDB whitelist
5. Restart Render service

### Issue: "Redis connection timeout"

**Cause**: Wrong Redis URL or network issue

**Solution**:
1. Verify Redis URL format: `rediss://default:password@host:port`
2. Check Redis Cloud console for correct details
3. Ensure database is "Active" (not paused)
4. Restart Redis connection

### Issue: File uploads not working (500 error)

**Cause**: Missing directories or permission issues

**Solution**:
1. Check that `uploads/` and `conversions/` directories exist
2. Verify `server.js` creates them:
   ```javascript
   const uploadsDir = path.join(__dirname, 'uploads');
   if (!fs.existsSync(uploadsDir)) {
     fs.mkdirSync(uploadsDir, { recursive: true });
   }
   ```
3. Check file size limits match your env variables
4. Check Render logs for specific error

### Issue: "No database selected" error

**Cause**: MongoDB connection string missing database name

**Solution**:
- Your MongoDB URI should end with:
  ```
  /file-tools-app?retryWrites=true&w=majority
  ```
- Add `file-tools-app` database name if missing

### Issue: Service keeps restarting (crashing)

**Cause**: Unhandled errors in code

**Solution**:
1. Check Render **Logs** tab for error messages
2. Look for specific error lines in your code
3. Most common: Missing npm dependencies
4. Run `npm install` locally and verify `package.json`
5. Push updated `package-lock.json` to GitHub

---

# Monitoring & Logs

### View Logs in Render

1. Go to Render Dashboard
2. Click on your service
3. Click **Logs** tab
4. See real-time server output

### Common Helpful Log Lines

```
[OK] npm install completed           → Dependencies installed
Connected to MongoDB                 → Database connection successful
Server is running                    → Backend ready
Error: Cannot find module 'express'  → Missing dependency
ECONNREFUSED - MongoDB down          → Database not responding
RTL_INTERNAL - Redis connection      → Redis not responding
```

### Enable Verbose Logging

Add to top of `server.js`:
```javascript
if (process.env.NODE_ENV === 'production') {
  console.log('Production mode enabled');
  console.log('DB:', process.env.MONGODB_URI.substring(0, 40) + '...');
}
```

### Set Up Email Alerts

In Render **Account Settings**:
1. Go to **Notifications**
2. Enable email for service failures
3. Get notified if service crashes

---

## Summary Checklist

### Before Deployment
- [ ] Code pushed to GitHub
- [ ] `.env` file NOT in git (only `.env.example`)
- [ ] All dependencies in `package.json`
- [ ] Server starts locally with `npm start`
- [ ] `public/` folder with HTML/CSS/JS exists

### During Deployment
- [ ] MongoDB Atlas cluster created and user added
- [ ] Redis Cloud database created
- [ ] Render service created and environment variables added
- [ ] Build completes without errors
- [ ] Service shows "Live" status

### After Deployment
- [ ] API health check passes
- [ ] Register/login works
- [ ] File upload works
- [ ] Frontend shows correct backend URL in console
- [ ] No CORS errors in browser
- [ ] Can download processed files

---

## Next Steps

1. **Test thoroughly** with all user types (guest, free, pro)
2. **Monitor logs** for first few days
3. **Set up alerts** if service crashes
4. **Plan scaling** if traffic increases (upgrade Render plan)
5. **Add custom domain** (optional, under service settings)
6. **Enable auto-redeploy** when you push code (already enabled)

---

## Support & Resources

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **MongoDB Atlas Docs**: [mongodb.com/docs/atlas](https://mongodb.com/docs/atlas)
- **Redis Cloud Docs**: [redis.com/docs](https://redis.com/docs)
- **Express.js**: [expressjs.com](https://expressjs.com)

**Need help?** Come back with specific error messages from Render logs! 🚀
