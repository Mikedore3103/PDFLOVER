# Code Reference - SaaS Authentication System

This file provides quick access to all key code components of the authentication system.

## File: middleware/guestLimiter.js

**Purpose:** Track and limit guest user (non-authenticated) conversions using IP address

**Key Features:**
- IP-based tracking (can switch to Redis for production)
- 3 conversions per 24 hours
- 10MB max file size
- Auto-reset daily

**Used In:** routes/tools.js (fallback middleware)

**Export:** guestLimiter middleware & utility functions

---

## File: middleware/usageLimiter.js

**Purpose:** Enforce usage limits for registered users based on plan (free/pro)

**Key Features:**
- JWT token verification
- Plan-based limits (free=20, pro=unlimited)
- Premium tool access control
- Daily usage tracking in MongoDB

**Used In:** routes/tools.js (primary middleware)

**Exports:**
- `usageLimiter()`: Main middleware
- `requireAuth`: Protect authenticated routes
- `requirePro`: Restrict to Pro plan only

---

## File: models/User.js

**Purpose:** MongoDB schema for registered users

**Fields:**
```javascript
- email: String (unique)
- password: String (bcrypt hashed)
- plan: 'free' | 'pro'
- dailyUsageCount: Number
- lastUsageReset: Date
- createdAt: Date
- updatedAt: Date
```

**Methods:**
- `comparePassword(candidate)`: Verify password
- `resetDailyUsage()`: Reset counter
- `isLimitExceeded()`: Check limit

**Statics:**
- `findByEmail(email)`: Query by email

---

## File: controllers/authController.js

**Purpose:** Handle user registration, login, profile management

**Functions:**

### register(req, res)
```
POST /api/auth/register
Input: { email, password }
- Validates input
- Hashes password with bcrypt
- Checks for duplicate email
- Creates user with plan='free'
- Returns JWT token
```

### login(req, res)
```
POST /api/auth/login
Input: { email, password }
- Finds user by email
- Compares passwords
- Generates JWT token (7 day expiry)
- Returns token + user data
```

### getProfile(req, res)
```
GET /api/auth/profile (requires auth)
- Returns user details
- Includes dailyUsageCount
- No sensitive data exposed
```

### updatePlan(req, res)
```
PUT /api/auth/plan (requires auth)
Input: { plan: 'free' | 'pro' }
- Updates user plan
- Regenerates token with new plan
- Returns new token
```

---

## File: controllers/toolController.js

**Purpose:** Handle file upload and job submission

**Key Change:** Now accepts userType and includes user context in responses

**Functions:**

### processToolRequest(req, res, overrideTool)
```
Core function for all tool endpoints
- Validates files
- Prepares job data with user info
- Adds job to BullMQ queue
- Returns jobId + user context

Middleware sets:
- req.userType: 'guest' | 'registered'
- req.user: User document (if registered)
- req.userLimits: Plan limits object
```

### Response Format
```javascript
{
  success: true,
  jobId: "123...",
  message: "File processing started...",
  userType: "guest|registered",
  limits: { maxConversions, maxFileSize },
  user: { plan, dailyUsageCount } // Only for registered
}
```

---

## File: routes/auth.js

**Purpose:** Define authentication endpoints

**Endpoints:**
```
POST   /api/auth/register          (public)
POST   /api/auth/login             (public)
GET    /api/auth/profile           (protected)
PUT    /api/auth/plan              (protected)
```

**Middleware Chain for Protected Routes:**
```
Request → requireAuth → Controller
                ↓
        Verify JWT token
        Extract userId
        Attach to req.userId
```

---

## File: routes/tools.js

**Purpose:** Define file tool endpoints with usage limiting

**Middleware Chain:**
```
Request
   ↓
upload.array('files')      [Multer: Parse multipart form]
   ↓
usageLimiter               [Check JWT + user limits]
   ↓
guestLimiter              [Fallback for guests]
   ↓
toolController.uploadTool  [Process request]
```

**Endpoints:**
```
POST /api/tools/upload             [Generic upload]
POST /api/tools/pdf-to-jpg         [Specific tool]
POST /api/tools/jpg-to-pdf
POST /api/tools/merge-pdf
POST /api/tools/split-pdf
POST /api/tools/compress-pdf       [Premium tool]
GET  /api/tools/job-status/:id     [No auth needed]
```

---

## File: public/index.html

**Changes from Original:**

### Header Auth Section
```html
<div class="auth-section">
  <div id="guestInfo">
    <button id="loginBtn">Login</button>
    <button id="registerBtn">Sign Up</button>
  </div>
  <div id="userInfo" class="hidden">
    <span id="userEmail">user@example.com</span>
    <span id="userPlan">FREE</span>
    <button id="logoutBtn">Logout</button>
  </div>
</div>
```

### New Modals
```html
<!-- Auth Modal (Login/Signup) -->
<div id="authModal" class="modal hidden">
  <form id="authForm">
    <input type="email" id="email" required>
    <input type="password" id="password" required>
    <input type="password" id="confirmPassword"> <!-- For signup -->
    <button type="submit">Login/Sign Up</button>
  </form>
  <button id="authToggleBtn">Toggle between login/signup</button>
</div>

<!-- Upgrade Modal (Limit Reached) -->
<div id="upgradeModal" class="modal hidden">
  <h3>Free Usage Limit Reached</h3>
  <button id="upgradeLoginBtn">Login</button>
  <button id="upgradeRegisterBtn">Create Free Account</button>
  <button id="upgradeProBtn">Upgrade to Pro</button>
</div>
```

---

## File: public/script.js

**New Functions:**

### Authentication Management
```javascript
getAuthToken()              // Get JWT from localStorage
setAuthToken(token)         // Save JWT to localStorage
removeAuthToken()           // Clear JWT
loadUserProfile()           // Fetch user from API (on page load)
updateAuthUI()              // Update header based on login state
logout()                    // Clear auth and reset UI
```

### Modal Handling
```javascript
openAuthModal(login=true)   // Show login or signup form
closeAuthModal()            // Hide auth modal
openUpgradeModal(title, msg)// Show limit-reached message
closeUpgradeModal()         // Hide upgrade modal
handleAuthSubmit(e)         // Process login/signup form
```

### Tool Access Control
```javascript
selectTool(toolElement)     // Check premium access before selecting
markPremiumTools()          // Add visual badges to premium tools
```

### Upload with Auth
```javascript
uploadFiles()               // Updated to include auth header
  Added: xhr.setRequestHeader('Authorization', `Bearer ${token}`)
  Handles: 429 (limit), 403 (premium tool)
```

### Event Listeners (New)
```javascript
loginBtn.addEventListener('click', () => openAuthModal(true))
registerBtn.addEventListener('click', () => openAuthModal(false))
logoutBtn.addEventListener('click', logout)
authForm.addEventListener('submit', handleAuthSubmit)
authToggleBtn.addEventListener('click', () => openAuthModal(!isLoginMode))
upgradeLoginBtn.addEventListener('click', () => openAuthModal(true))
upgradeRegisterBtn.addEventListener('click', () => openAuthModal(false))
```

---

## File: public/style.css

**New Styles Added:**

```css
/* Header Auth Section */
.auth-section              // Position in header
.user-info                 // User display area
.auth-btn                  // Login/Signup buttons
.plan-badge                // Show user's plan
.plan-badge.pro            // Gold gradient for Pro

/* Modals */
.modal                     // Fixed overlay
.modal-content             // Centered dialog box
.modal-header              // Header with close button
.modal-body                // Form content
.close-btn                 // X button

/* Forms */
.form-group                // Label + input wrapper
.form-group input          // Styled input fields
.form-group input:focus    // Blue outline + shadow
.auth-submit-btn           // Submit button
.auth-toggle               // Switch between login/signup
.link-btn                  // Inline link button

/* Upgrade Modal */
.upgrade-content           // Centered content
.upgrade-icon              // Large emoji (🚀)
.upgrade-options           // Flex button layout
.upgrade-btn               // Option buttons
.upgrade-btn.pro           // Gold gradient for Pro option

/* Premium Tools */
.tool-card.premium::after  // "PRO" badge
```

---

## File: server.js

**Key Changes:**

```javascript
// Added imports
const mongoose = require('mongoose');
const authRouter = require('./routes/auth');

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// Port changed from 3000 to 3001
const PORT = process.env.PORT || 3001;

// CORS headers added
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  // ... other CORS headers
});

// New auth routes
app.use('/api/auth', authRouter);
```

---

## File: package.json

**New Dependencies:**

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",           // Password hashing
    "jsonwebtoken": "^9.0.2",       // JWT generation
    "mongoose": "^8.5.3",           // MongoDB ORM
    // ... existing dependencies
  }
}
```

---

## Data Flow Diagrams

### Guest User File Upload
```
1. Guest clicks tool
   ↓
2. selectTool() checks if premium
   → If premium & no auth: blocks with modal
   ↓
3. uploadFiles() (no auth header)
   ↓
4. POST /api/tools/upload (no Bearer token)
   ↓
5. usageLimiter
   → No JWT found
   → Passes through (next())
   ↓
6. guestLimiter
   → Gets req.ip
   → Checks guestUsage[ip].count < 3
   → req.userType = 'guest'
   → Increments counter
   → Passes through
   ↓
7. toolController.uploadTool
   → Creates job with userType='guest'
   → Returns response with limits
   ↓
8. Frontend shows: "3/3 conversions remaining"
```

### Free User at Limit
```
1. User logged in (9 days, 20 conversions done)
   ↓
2. uploadFiles() (includes Auth header)
   ↓
3. POST /api/tools/upload (Bearer token)
   ↓
4. usageLimiter
   → Verifies JWT
   → Finds user in DB
   → Checks: 20 >= 20 (limit)
   → Returns 429
   ↓
5. Frontend receives status 429
   → If errorResponse is 429:
   → Opens upgradeModal
   → Shows upgrade options
   ↓
6. User can:
   → Login with different account
   → Create free account (gets 20 more)
   → Upgrade to Pro (unlimited)
```

### Pro User With Premium Tool
```
1. Pro user clicks "Compress PDF"
   ↓
2. selectTool('compress-pdf')
   → Checks: PREMIUM_TOOLS.includes('compress-pdf')
   → Checks: currentUser.plan === 'pro'
   → ✓ Allowed
   ↓
3. uploadFiles() (includes Pro auth)
   ↓
4. POST /api/tools/compress-pdf (Bearer token)
   ↓
5. usageLimiter
   → Verifies JWT
   → Finds user (plan='pro')
   → Checks: isPremiumToolRestricted('compress-pdf', 'pro')
   → false (Pro has access)
   → Unlimited conversions ✓
   → 500MB file size ✓
   → Passes through
   ↓
6. guestLimiter
   → Skipped (already authenticated)
   ↓
7. toolController.compressPdf
   → Processes file
   → Returns jobId
   ↓
8. File compressed successfully
```

---

## Key Constants

### GUEST_LIMITS (guestLimiter.js)
```javascript
{
  maxConversions: 3,
  maxFileSize: 10 * 1024 * 1024,      // 10MB
  resetInterval: 24 * 60 * 60 * 1000  // 24 hours
}
```

### USER_LIMITS (usageLimiter.js)
```javascript
{
  free: {
    maxConversions: 20,
    maxFileSize: 50 * 1024 * 1024,
    resetInterval: 24 * 60 * 60 * 1000
  },
  pro: {
    maxConversions: -1,               // unlimited
    maxFileSize: 500 * 1024 * 1024,
    resetInterval: 24 * 60 * 60 * 1000
  }
}
```

### PREMIUM_TOOLS (usageLimiter.js & script.js)
```javascript
new Set([
  'compress-pdf',
  'ocr-pdf',
  'batch-convert'
])
```

---

## Error Handling

### Frontend Error Responses
```javascript
// 429 - Limit exceeded
if (xhr.status === 429) {
  openUpgradeModal();
}

// 403 - Premium tool access denied
if (xhr.status === 403) {
  openUpgradeModal('Premium Tool Required', response.message);
}

// Other errors
alert('Upload failed: ' + response.message);
```

### Backend Error Responses
```javascript
// Guest limit exceeded
errorResponse(res, 'Free usage limit reached...', 429)

// Premium tool restricted
errorResponse(res, 'This tool requires a Pro plan.', 403)

// File too large
errorResponse(res, 'File size exceeds limit...', 400)
```

---

## Testing Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Upload as guest (3x limit)
- [ ] Upload as free user (20x limit)
- [ ] Try premium tool as free user
- [ ] Check plan in header
- [ ] Logout
- [ ] View user in MongoDB
- [ ] Reset daily usage
- [ ] Test file size limits
- [ ] Test API endpoints with curl
- [ ] Check JWT token expiry

---

## Production Deployment

1. **Environment Setup**
   ```bash
   # Set these in production
   JWT_SECRET=<strong-random-64-char-string>
   MONGODB_URI=<mongodb-atlas-url>
   REDIS_URL=<redis-cloud-url>
   PORT=<production-port>
   ```

2. **Security**
   - [ ] Change JWT_SECRET
   - [ ] Use MongoDB Atlas (not localhost)
   - [ ] Use Redis Cloud (not localhost)
   - [ ] Enable HTTPS/SSL
   - [ ] Add CORS restrictions
   - [ ] Implement rate limiting
   - [ ] Add request validation
   - [ ] Set strong password rules

3. **Monitoring**
   - [ ] Set up error logging
   - [ ] Monitor API response times
   - [ ] Track user registrations
   - [ ] Monitor resource usage
   - [ ] Set up alerts

4. **Scaling**
   - [ ] Switch guest limiter to Redis
   - [ ] Add database indexes
   - [ ] Cache user profiles
   - [ ] Use CDN for static files
   - [ ] Load balancer setup

---

This complete reference covers all components of the SaaS authentication system.
