# SaaS Authentication System - Complete Implementation Guide

## Overview

This document provides a complete guide to the SaaS authentication system implemented for the File Tools Platform. The system supports three user types: Guest Users (no login), Free Registered Users (limited usage), and Pro Users (unlimited access).

---

## Architecture

### User Types & Limits

#### 1. Guest User
- **No login required**
- **Daily Limits:**
  - Max 3 conversions per day
  - Max file size: 10MB
- **Storage:** No database record
- **Tracking:** IP address-based with in-memory/Redis storage

#### 2. Free Registered User
- **Account Required:** Optional signup for higher limits
- **Daily Limits:**
  - Max 20 conversions per day
  - Max file size: 50MB
- **Storage:** Stored in MongoDB with usage tracking

#### 3. Pro User
- **Account Required:** Paid subscription
- **Daily Limits:**
  - Unlimited conversions
  - Max file size: 500MB
- **Premium Features:** Access to exclusive tools (compress-pdf, ocr-pdf, etc.)

---

## Core Components

### 1. Database Models

#### User Model (`models/User.js`)

```javascript
/**
 * User Schema
 * - email: Unique user email
 * - password: Bcrypt-hashed password
 * - plan: 'free' or 'pro'
 * - dailyUsageCount: Tracks conversions per day
 * - lastUsageReset: Timestamp of last daily reset
 */

userSchema.methods:
- comparePassword(candidatePassword): Verify password match
- resetDailyUsage(): Reset daily conversion counter
- isLimitExceeded(): Check if user hit daily limit

userSchema.statics:
- findByEmail(email): Find user by email
```

### 2. Middleware

#### Guest Limiter (`middleware/guestLimiter.js`)

**Responsibility:** Track and limit guest usage

```javascript
Key Features:
- Track guest conversions by IP address
- 3 conversions per 24 hours limit
- 10MB per file maximum
- Auto-reset counters daily
- In-memory storage (production: Redis)

Exports:
- guestLimiter(): Main middleware function
- getGuestUsage(ip): Check guest usage stats
- cleanupOldRecords(): Remove stale records
- GUEST_LIMITS: Configuration object
```

#### Usage Limiter (`middleware/usageLimiter.js`)

**Responsibility:** Enforce per-user and per-plan limits

```javascript
Key Features:
- JWT token verification
- Plan-based limit enforcement
- Premium tool access control
- Daily usage tracking & reset
- File size validation per plan

Exports:
- usageLimiter(): Main middleware for tool routes
- requireAuth: Protect authenticated routes
- requirePro: Restrict to Pro plan users
- USER_LIMITS: Plan definitions
- PREMIUM_TOOLS: Set of premium tools
```

### 3. Authentication System

#### Auth Controller (`controllers/authController.js`)

```javascript
Routes:
POST /api/auth/register
- Email validation
- Password strength check (min 6 chars)
- Duplicate email detection
- Auto-assign 'free' plan

POST /api/auth/login
- Credential verification
- JWT token generation (7 days expiry)

GET /api/auth/profile (requires auth)
- Return user details
- Include daily usage stats

PUT /api/auth/plan (requires auth)
- Update user plan
- Regenerate token with new plan
```

#### Auth Routes (`routes/auth.js`)

```javascript
Public:
- POST /api/auth/register: Create account
- POST /api/auth/login: Login

Protected:
- GET /api/auth/profile: Get profile
- PUT /api/auth/plan: Update plan
```

### 4. Tool Processing

#### Updated Tool Controller (`controllers/toolController.js`)

```javascript
Changes from original:
- Accept userType, userId, userPlan in job data
- Include limits in response
- Handle 403 (premium tool) errors
- Handle 429 (limit exceeded) errors

Response Format:
{
  "success": true,
  "jobId": "...",
  "userType": "guest|registered",
  "limits": { maxConversions, maxFileSize },
  "user": { plan, dailyUsageCount } // For registered users
}
```

#### Updated Tool Routes (`routes/tools.js`)

```javascript
Middleware Chain:
POST /api/tools/upload
  ↓ upload.array('files')
  ↓ usageLimiter (checks JWT, applies registered user limits)
  ↓ guestLimiter (fallback for guests)
  ↓ toolController.uploadTool

Same chain for:
- /pdf-to-jpg
- /jpg-to-pdf
- /merge-pdf
- /split-pdf
- /compress-pdf (commented out for demo)
```

### 5. Frontend Integration

#### Updated Frontend (`public/index.html`)

New Elements:
```html
- Auth Section: Login/Register buttons, user info display
- Auth Modal: Login/Signup form with toggle
- Upgrade Modal: Show limit-reached message with options
- Plan Badge: Display user's current plan
- Premium Tool Indicators: Badge on premium tools
```

#### Frontend Logic (`public/script.js`)

```javascript
Key Functions:

Auth Management:
- getAuthToken(): Retrieve JWT from localStorage
- setAuthToken(token): Store JWT
- removeAuthToken(): Clear token
- loadUserProfile(): Fetch user from API
- updateAuthUI(): Update header based on login state
- logout(): Clear auth and redirect

Modal Handling:
- openAuthModal(login): Show login/signup modal
- closeAuthModal(): Hide modal
- openUpgradeModal(title, message): Show upgrade message
- closeUpgradeModal(): Hide modal
- handleAuthSubmit(e): Process login/signup

Tool Access:
- selectTool(toolElement): Check premium access before selecting
- markPremiumTools(): Add visual indicators
- uploadFiles(): Include auth header in request

Rate Limit Response:
- 429 Status: Opens upgrade modal asking to create account
- 403 Status: Shows "Premium Tool Required" message
```

---

## Request/Response Flow

### Guest User Converting a File

```
1. Guest clicks tool without login
2. selectTool() allows if not premium
3. Guest uploads file
4. uploadFiles() sends request (no auth header)
5. Middleware chain:
   - usageLimiter: No token, passes through
   - guestLimiter: Checks IP, increments count, validates 10MB limit
   - toolController: Processes request with userType='guest'
6. Frontend shows progress with guest limits displayed
7. File processed and downloaded
```

### Free User at Limit

```
1. Free user logged in, hit 20 conversions
2. Clicks tool, attempts upload
3. uploadFiles() sends request with Authorization header
4. Middleware chain:
   - usageLimiter: Verifies token, finds user in DB
   - Checks dailyUsageCount (20) >= limit (20)
   - Returns 429 with message
5. Frontend receives 429, opens upgrade modal
6. User can Login, Sign Up, or Upgrade to Pro
7. If signs up as new user, gets 20 conversions
```

### Pro User Accessing Premium Tool

```
1. Pro user clicks compress-pdf tool
2. selectTool() checks if premium (compress-pdf = yes)
3. Checks currentUser.plan === 'pro' ✓
4. Allows tool selection
5. User uploads file
6. uploadFiles() sends request with auth header
7. usageLimiter:
   - Verifies token
   - Finds pro user
   - Unlimited conversions ✓
   - 500MB file size ✓
8. Access to tool granted
9. File processed successfully
```

---

## Configuration

### Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/file-tools-app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3001
```

### Guest Limits (hardcoded in middleware)

```javascript
GUEST_LIMITS = {
  maxConversions: 3,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  resetInterval: 24 * 60 * 60 * 1000 // 24 hours
}
```

### User Limits (hardcoded in middleware)

```javascript
USER_LIMITS = {
  free: {
    maxConversions: 20,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    resetInterval: 24 * 60 * 60 * 1000
  },
  pro: {
    maxConversions: -1, // unlimited
    maxFileSize: 500 * 1024 * 1024, // 500MB
    resetInterval: 24 * 60 * 60 * 1000
  }
}
```

### Premium Tools

```javascript
PREMIUM_TOOLS = [
  'compress-pdf',
  'ocr-pdf',
  'batch-convert'
]
```

---

## API Endpoints

### Authentication Endpoints

```
POST /api/auth/register
Request:  { email, password }
Response: { message, token, user: { id, email, plan } }

POST /api/auth/login
Request:  { email, password }
Response: { message, token, user: { id, email, plan, dailyUsageCount } }

GET /api/auth/profile
Headers:  Authorization: Bearer <token>
Response: { user: { id, email, plan, dailyUsageCount, lastUsageReset, createdAt } }

PUT /api/auth/plan
Headers:  Authorization: Bearer <token>
Request:  { plan: 'pro' }
Response: { message, token, user: { id, email, plan } }
```

### Tool Endpoints

```
POST /api/tools/upload
Headers:  Authorization: Bearer <token> (optional)
Body:     multipart/form-data { files, tool }
Response: { success, jobId, userType, limits, user? }
Status:   429 if limit exceeded, 403 if premium tool restricted

GET /api/tools/job-status/:id
Response: { jobId, status, output?, error? }
```

---

## Security Considerations

1. **Password Security**
   - Bcrypt hashing with 12 salt rounds
   - Minimum 6 characters enforced
   - Never returned in responses

2. **JWT Tokens**
   - HS256 algorithm
   - 7-day expiration
   - Stored in localStorage (consider httpOnly cookies for production)
   - Verified on every protected route

3. **Rate Limiting**
   - Per-IP for guests (prevents abuse)
   - Per-user for registered (server-tracked)
   - Daily reset prevents brute force

4. **File Validation**
   - Size limits enforced at middleware level
   - File type validation in validator.js
   - Server-side validation critical

5. **Premium Tool Protection**
   - Checked in two places: Frontend (UX) and Backend (Security)
   - Backend validation prevents direct API manipulation
   - Token required for premium tools

---

## Testing the System

### 1. Test Guest Access

```
curl -X POST http://localhost:3001/api/tools/upload \
  -F "files=@test.pdf" \
  -F "tool=pdf-to-jpg"
```

Expected: Success (no auth required)

### 2. Test Registration

```
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Expected: Returns JWT token, plan='free'

### 3. Test Rate Limit

```
# Login user
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login ...)

# Hit 20 conversions limit
for i in {1..20}; do
  curl -X POST http://localhost:3001/api/tools/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@test.pdf" \
    -F "tool=pdf-to-jpg"
done

# 21st attempt should return 429
```

### 4. Test Premium Tool Access

Free user attempting premium tool:
```
curl -X POST http://localhost:3001/api/tools/compress-pdf \
  -H "Authorization: Bearer $FREE_USER_TOKEN" \
  -F "files=@test.pdf"
```

Expected: 403 Forbidden - "This tool requires a Pro plan"

---

## File Structure

```
file-tools-app/
├── middleware/
│   ├── guestLimiter.js        # Guest usage tracking
│   └── usageLimiter.js        # Registered user limits
├── models/
│   └── User.js                # MongoDB user schema
├── controllers/
│   ├── authController.js      # Auth logic
│   └── toolController.js      # Updated with user context
├── routes/
│   ├── auth.js                # Auth endpoints
│   └── tools.js               # Tool routes with middleware
├── public/
│   ├── index.html             # Updated with auth UI
│   ├── script.js              # Updated with auth logic
│   └── style.css              # Updated with auth styles
├── server.js                  # Updated with auth routes
└── package.json               # Updated dependencies
```

---

## Deployment Checklist

- [ ] Set strong JWT_SECRET in environment
- [ ] Configure MongoDB connection
- [ ] Configure Redis connection
- [ ] Enable HTTPS/SSL
- [ ] Use httpOnly cookies for JWT (not localStorage)
- [ ] Implement refresh token rotation
- [ ] Add rate limiting (express-rate-limit)
- [ ] Enable CORS properly (not *)
- [ ] Add request validation (express-validator)
- [ ] Add logging and monitoring
- [ ] Set up database backups
- [ ] Configure payment processor for Pro upgrades
- [ ] Add email verification for accounts
- [ ] Implement password reset flow
- [ ] Add user dashboard for plan management

---

## Future Enhancements

1. **Social Login** (Google, GitHub, etc.)
2. **Email Verification** for new accounts
3. **Password Reset** flow
4. **User Dashboard** with usage stats
5. **Payment Integration** (Stripe, Paddle)
6. **Subscription Management** (cancel, upgrade, downgrade)
7. **Team/Organization Plans**
8. **API Keys** for programmatic access
9. **Usage Analytics** and reports
10. **Two-Factor Authentication (2FA)**

---

## Troubleshooting

### Issue: "MongoDB connection error"
- **Solution:** Ensure MongoDB is running: `mongod`
- Check MONGODB_URI environment variable

### Issue: "Redis connection failed"
- **Solution:** Ensure Redis is running: `redis-server`
- Check REDIS_HOST and REDIS_PORT

### Issue: JWT token invalid
- **Solution:** Token may be expired (7 days)
- User needs to login again
- Check JWT_SECRET matches between sessions

### Issue: Guest limit not resetting
- **Solution:** Check system clock is correct
- In-memory storage: Clears on server restart
- Switch to Redis for persistent storage

### Issue: Premium tool still accessible for free users
- **Solution:** Browser may cache response
- Clear localStorage: `localStorage.clear()`
- Check Authorization header is being sent
- Verify backend middleware is in correct order

---

## Success Metrics

- ✓ Guests can upload without login
- ✓ Guests limited to 3 conversions/day
- ✓ Registered users get 20 conversions/day
- ✓ Pro users get unlimited conversions
- ✓ Premium tools blocked for non-Pro users
- ✓ Daily limits reset automatically
- ✓ JWT tokens validate properly
- ✓ File size limits enforced per plan
- ✓ UI shows user type and limits
- ✓ Upgrade prompts appear at limits
