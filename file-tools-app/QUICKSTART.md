# Quick Start Guide - File Tools SaaS Platform

## Prerequisites

- Node.js 18+ 
- MongoDB running locally or Atlas connection
- Redis running locally or cloud instance
- npm or yarn

## Installation

### 1. Install Dependencies

```bash
cd file-tools-app
npm install
```

All required packages:
```
- express: Web framework
- mongoose: MongoDB ORM
- jsonwebtoken: JWT authentication
- bcryptjs: Password hashing
- bullmq: Job queue
- ioredis: Redis client
- multer: File uploads
- pdf-lib, pdf2pic, pdfkit: PDF processing
- node-cron: Task scheduling
```

### 2. Configure Environment

Create `.env` file in project root:

```env
# Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/file-tools-app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 3. Start MongoDB

```bash
# macOS/Linux
mongod

# Windows
# Start MongoDB Service or run:
mongod --dbpath "C:\data\db"
```

### 4. Start Redis

```bash
# macOS/Linux
redis-server

# Windows (if installed via WSL)
redis-server
```

### 5. Start the Application

```bash
npm start
```

Server runs on `http://localhost:3001`

---

## API Examples

### Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Upload File as Guest

```bash
curl -X POST http://localhost:3001/api/tools/upload \
  -F "files=@document.pdf" \
  -F "tool=pdf-to-jpg"
```

### Upload File as Authenticated User

```bash
curl -X POST http://localhost:3001/api/tools/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@document.pdf" \
  -F "tool=merge-pdf"
```

### Check Job Status

```bash
curl -X GET http://localhost:3001/api/tools/job-status/JOB_ID
```

---

## Frontend Usage

### Opening in Browser

```
http://localhost:3001
```

### Features to Test

1. **Guest Access**
   - Click on a tool (e.g., "PDF to JPG")
   - Drag & drop a PDF file
   - Click "Process Files"
   - File processes without login needed
   - Try 4+ times to see "Limit Reached" message

2. **Register User**
   - Click "Sign Up" button
   - Enter email and password
   - Submit form
   - You're logged in, see "FREE" badge in header

3. **Upload File as User**
   - With authentication, upload files
   - See your daily usage count
   - Try 21+ conversions to hit free plan limit

4. **Premium Tools**
   - Try to click "Compress PDF" (marked with PRO badge)
   - See "This tool requires a Pro plan" message
   - Click "Upgrade to Pro" to see options

5. **Logout**
   - Click your email > "Logout"
   - Back to guest mode

---

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  password: "$2a$12$...", // bcrypt hash
  plan: "free", // or "pro"
  dailyUsageCount: 5,
  lastUsageReset: 2024-03-10T14:30:00.000Z,
  createdAt: 2024-03-09T10:15:00.000Z,
  updatedAt: 2024-03-10T14:30:00.000Z
}
```

### Upload Files (handled by multer)

```
uploads/
├── 1710080400000-1234567890-filename.pdf
├── 1710080500000-9876543210-document.pdf
└── ... auto-deleted after 30 minutes
```

### Conversion Results

```
conversions/
├── 1710080400000-pdf-to-jpg-output.zip
├── 1710080500000-merge-pdf-output.pdf
└── ... auto-deleted after 6 hours
```

---

## Middleware Order (Critical)

In `routes/tools.js`, the middleware order matters:

```javascript
router.post('/upload', 
  upload.array('files'),        // 1. Parse multipart form
  usageLimiter,                 // 2. Check JWT & user limits
  guestLimiter,                 // 3. Fallback for guests
  toolController.uploadTool     // 4. Process request
);
```

Why this order:
1. Files must be parsed first (multer)
2. usageLimiter checks JWT and applies user limits
3. If guestLimiter middleware: no JWT, treat as guest
4. Controller processes with user context

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 403 Forbidden (Premium Tool)
```json
{
  "success": false,
  "message": "This tool requires a Pro plan."
}
```

### 429 Too Many Requests (Limit Exceeded)
```json
{
  "success": false,
  "message": "Free usage limit reached. Create a free account for higher limits."
}
```

### 409 Conflict (Email exists)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

## Debugging Tips

### Check Guest Usage

Add this to `public/script.js`:
```javascript
// In console to see guest usage
fetch('/api/tools/upload', {
  method: 'POST'
  // Will show limits in response
});
```

### Check JWT Token

In browser console:
```javascript
// View token
console.log(localStorage.getItem('authToken'));

// Decode (copy to jwt.io to verify)
atob(localStorage.getItem('authToken').split('.')[1]);
```

### Check User in Database

```bash
# MongoDB shell
mongosh

# In mongo shell:
use file-tools-app
db.users.findOne({ email: "user@example.com" })
```

### View Server Logs

```bash
# Full output
npm start

# Should show:
# - "File conversion worker started"
# - "[Scheduler] Cleanup scheduler started"
# - "Server is running at http://localhost:3001"
# - MongoDB connection status
```

### Clear All Data

```bash
# Reset MongoDB
mongosh
db.dropDatabase()

# Clear guest usage (in-memory):
# Just restart the server

# Clear localStorage in browser:
# Browser DevTools > Application > Local Storage > Clear
```

---

## Security Best Practices

### For Development

```env
JWT_SECRET=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/file-tools-app
```

### For Production

1. **Change JWT Secret**
   ```env
   JWT_SECRET=use-a-strong-random-64-character-string
   ```

2. **Use Production MongoDB**
   ```env
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/file-tools
   ```

3. **Use Production Redis**
   ```env
   REDIS_URL=redis://:password@host:port
   ```

4. **Enable HTTPS**
   - Use reverse proxy (nginx)
   - Install SSL certificates
   - Force HTTPS redirects

5. **Change Multer Config**
   - Increase fileSize limits for production
   - Consider cloud storage (S3, GCS)
   - Add virus scanning

6. **Additional Middleware**
   ```javascript
   // In server.js
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit per IP
   });
   
   app.use('/api/', limiter);
   ```

---

## Performance Tips

### Guest Usage Storage
Currently using in-memory Map. For production:

```javascript
// Switch to Redis in guestLimiter.js
const redis = require('ioredis');
const client = new Redis();

// Store: client.setex(`guest:${ip}`, 86400, JSON.stringify(record))
// Get: client.get(`guest:${ip}`)
```

### Database Indexes

```javascript
// In User.js or MongoDB
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: 1 })
```

### Caching User Profile

```javascript
// Cache for 5 minutes to reduce DB queries
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });
```

---

## Upgrading User Plan

Currently, plan upgrades are manual. To automate with Stripe:

```javascript
// Placeholder for future integration
router.post('/api/stripe/webhook', (req, res) => {
  const event = req.body;
  
  if (event.type === 'customer.subscription.created') {
    // Find user and update plan to 'pro'
  }
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MongoDB connection failed" | Check mongod is running, correct MONGODB_URI |
| "Redis connection failed" | Check redis-server is running, correct REDIS_HOST/PORT |
| "Port 3001 already in use" | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| "JWT token invalid" | Token expired (7 days), user needs to login again |
| "Guest limit persists after 24h" | Restart server (in-memory resets on restart) |
| "File size error" | Check limits in middleware/usageLimiter.js |
| "Premium tool accessible to free users" | Clear browser cache and localStorage |

---

## Next Steps

1. ✅ Register your first user
2. ✅ Upload your first file as guest
3. ✅ Hit the guest limit (4 uploads)
4. ✅ Create account to get 20 conversions
5. ✅ Try premium tool (see lock message)
6. 🔜 Integrate payment processor
7. 🔜 Add email verification
8. 🔜 Create user dashboard
9. 🔜 Deploy to production
10. 🔜 Monitor and scale

---

## Getting Help

### Check Logs
```bash
# Server logs show all errors
npm start
```

### Check Network Tab
- Browser DevTools > Network tab
- See all API requests/responses
- Check response status codes

### Database Inspection
```bash
mongosh
show databases
use file-tools-app
db.users.find()
```

### Port Testing
```bash
# Check if port is open
netstat -an | grep 3001

# Or Windows:
netstat -ano | findstr :3001
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser/Frontend                      │
│  - Tool Selection → Auth UI → File Upload               │
│  - localStorage: authToken, userInfo                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST API
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Express Server                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Routes & Middleware                              │  │
│  │ - auth.js: /register, /login, /profile           │  │
│  │ - tools.js: /upload, /job-status                 │  │
│  │ - guestLimiter: IP-based tracking (3/day)        │  │
│  │ - usageLimiter: JWT verification (20 or ∞/day)   │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↓            ↓            ↓         │
│              ┌──────────────────────────────────────┐   │
│              │   Controllers & Services             │   │
│              │ - authController: JWT generation     │   │
│              │ - toolController: Job submission     │   │
│              │ - conversionWorker: File processing  │   │
│              └──────────────────────────────────────┘   │
└────────┬─────────────────────────────────┬──────────────┘
         │                                 │
   ┌─────↓─────┐             ┌─────────────↓────────────┐
   │ MongoDB   │             │ Redis/BullMQ             │ 
   │ - Users   │             │ - Job Queue              │
   │ - Usage   │             │ - Rate Limit Storage     │
   └───────────┘             │ - Cleanup Tasks          │
                             └──────────────────────────┘
```

---

Generated: 2024-03-10
Last Updated: Complete SaaS Authentication System
