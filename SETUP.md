# Genz Messenger - Complete Setup Guide

## 🎯 Overview

This guide will help you set up Genz Messenger for deployment using free services. The app builds and passes its tests, but before inviting many users, complete the items in `PRODUCTION_READINESS.md` (Cloudinary media storage, payment-process decision, Redis/TURN for scale).

## ✅ Issues Fixed

1. **Registration Password Validation** - Strict policy: minimum 12 characters, must include uppercase, lowercase, digit, and special character (enforced on register, password change, and reset)
2. **Schedule Message Modal** - Fixed button click handler with type="button"
3. **Docker Compose Profiles** - Removed confusing profiles for easier deployment
4. **Environment Variables** - Added clear instructions for all required services

---

## 🚀 Quick Start (Free Services Setup)

### Step 1: MongoDB Atlas (Free Tier - 512MB)

**Required for:** Database storage

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Click "Build a Database" → Select "Free" tier → Create cluster
4. **Database Access:**
   - Click "Database Access" → "Create Database User"
   - Username: `genzwhatsapp`
   - Password: Generate strong password (save it!)
   - Click "Create User"
5. **Network Access:**
   - Click "Network Access" → "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
6. **Get Connection String:**
   - Click "Connect" → "Connect your application"
   - Select Node.js version
   - Copy connection string
   - Replace `<password>` with your database password
   - Example: `mongodb+srv://genzwhatsapp:YOUR_PASSWORD@cluster0.mongodb.net/genz-whatsapp?retryWrites=true&w=majority`

**Save this as:** `MONGODB_URI` in your `.env` file

---

### Step 2: Cloudinary (Free Tier - 25GB/month)

**Required for:** Media storage (images, videos, files)

1. Go to https://cloudinary.com/users/register/free
2. Create free account
3. **Get API Credentials:**
   - Dashboard → Click your account name → "API Keys"
   - Copy the following:
     - **Cloud name** (e.g., `abc123`)
     - **API Key** (e.g., `1234567890`)
     - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

**Save these as:**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

### Step 3: SendGrid (Free Tier - 100 emails/day)

**Required for:** Email verification and password reset

1. Go to https://sendgrid.com/free/
2. Create free account
3. **Create API Key:**
   - Settings → API Keys → "Create API Key"
   - Name: `Genz Messenger`
   - Permissions: Full Access
   - Click "Create & View"
   - **Copy the API Key** (you won't see it again!)
4. **Verify Sender Identity:**
   - Settings → Sender Authentication → "Verify a Single Sender"
   - Add your email address
   - Click "Verify"
   - Check your email and click verification link

**Save these as:**
- `SMTP_HOST`: `smtp.sendgrid.net`
- `SMTP_PORT`: `587`
- `SMTP_SECURE`: `false`
- `SMTP_USER`: `apikey`
- `SMTP_PASS`: Your SendGrid API Key
- `MAIL_FROM`: Your verified email address

---

### Step 4: Generate Security Keys

**Required for:** JWT authentication and encryption

Run these commands in your terminal to generate strong random strings:

```bash
# Generate JWT Secret (48 hex characters)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate JWT Refresh Secret (48 hex characters)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate Admin JWT Secret (48 hex characters)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate Admin Bootstrap Token (48 hex characters)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate Backup Encryption Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Message Encryption Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these as:**
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_JWT_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN`
- `BACKUP_ENCRYPTION_KEY`
- `MESSAGE_ENCRYPTION_SECRET`

---

## 📝 Environment Variables Setup

### Backend (.env)

Create `backend/.env` file with the following:

```bash
# ── Server ───────────────────────────────────────
PORT=5000
NODE_ENV=production

# ── Database (from Step 1) ───────────────────────
MONGODB_URI=mongodb+srv://genzwhatsapp:YOUR_PASSWORD@cluster0.mongodb.net/genz-whatsapp?retryWrites=true&w=majority

# ── Auth (from Step 4) ───────────────────────────
JWT_SECRET=your_generated_48_hex_secret
JWT_REFRESH_SECRET=your_different_48_hex_secret
ADMIN_JWT_SECRET=your_another_48_hex_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── URLs ─────────────────────────────────────────
FRONTEND_URL=https://your-app-name.vercel.app
PUBLIC_API_URL=https://your-app-name.onrender.com

# ── Security (from Step 4) ─────────────────────────
ADMIN_BOOTSTRAP_TOKEN=your_generated_48_hex_token
BACKUP_ENCRYPTION_KEY=your_32_byte_key
MESSAGE_ENCRYPTION_SECRET=your_32_byte_secret
ALLOW_ANONYMOUS_DEVICE_AUTH=false
ALLOW_SOCKET_WITHOUT_AUTH=false
ALLOW_MOCK_PAYMENTS=false

# ── Media (from Step 2) ───────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Email (from Step 3) ─────────────────────────
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
MAIL_FROM=your-verified-email@example.com

# ── Redis (Optional - skip for now) ───────────────
REDIS_URL=
```

### Frontend (.env)

Create `frontend/.env` file with the following:

```bash
VITE_API_URL=https://your-app-name.onrender.com
VITE_SOCKET_URL=https://your-app-name.onrender.com
VITE_REQUIRE_AUTH=true
```

---

## 🌐 Deployment Options

### Option 1: Render.com + Vercel (Recommended - Free)

**Backend (Render.com):**

1. Go to https://render.com
2. Create free account
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `genz-whatsapp-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all from backend `.env` file
6. Click "Deploy Web Service"
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL (e.g., `https://genz-whatsapp-backend.onrender.com`)

**Frontend (Vercel):**

1. Go to https://vercel.com
2. Create free account
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: Your Render backend URL
     - `VITE_SOCKET_URL`: Your Render backend URL
6. Click "Deploy"
7. Wait for deployment (2-5 minutes)
8. Copy your frontend URL (e.g., `https://genz-whatsapp.vercel.app`)

**Update Backend Environment Variables:**
- Go back to Render dashboard
- Update `FRONTEND_URL` with your Vercel URL
- Update `PUBLIC_API_URL` with your Render backend URL
- Redeploy backend

---

### Option 2: Railway.app (Alternative - Free)

1. Go to https://railway.app
2. Create free account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will detect both backend and frontend
6. Add environment variables for each service
7. Click "Deploy"
8. Wait for deployment

---

## 🧪 Testing Your Deployment

### 1. Test Backend Health

```bash
curl https://your-backend-url.onrender.com/api/health
```

Expected response:
```json
{"success":true,"status":"ok","services":{"mongo":"connected","redis":"connected","mediaStorage":"cloudinary"}}
```

### 2. Test Registration

1. Open your frontend URL
2. Click "Register"
3. Enter username, phone number, and a strong password (min 12 chars + uppercase, lowercase, digit, special)
4. Click "Sign Up"
5. You should be logged in successfully

### 3. Test Messaging

1. Create a new chat
2. Send a message
3. Verify message appears in real-time

### 4. Test Media Upload

1. Try sending an image
2. Verify it uploads to Cloudinary
3. Verify it displays correctly

### 5. Test Schedule Message

1. Type a message
2. Click the schedule (calendar) icon
3. Select a future date/time
4. Click "Schedule"
5. Verify the message is scheduled

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error:** `FATAL: JWT_SECRET environment variable is required in production`

**Solution:** Make sure you've set all required environment variables in your hosting platform dashboard.

### Media Upload Fails

**Error:** `Cloudinary configuration missing`

**Solution:** Verify your Cloudinary credentials are correct and the service is not in trial mode.

### Email Not Sending

**Error:** `SMTP authentication failed`

**Solution:** 
- Verify SendGrid API key is correct
- Make sure sender identity is verified
- Check SMTP settings match the guide

### Frontend Can't Connect to Backend

**Error:** `Network error` or `CORS error`

**Solution:**
- Verify `VITE_API_URL` and `VITE_SOCKET_URL` are correct
- Check backend CORS configuration
- Ensure backend is running and accessible

---

## 📊 System Status After Setup

- ✅ Registration: Working (min 12 chars + complexity)
- ✅ Schedule Messages: Working (modal fixed)
- ✅ Media Storage: Working (Cloudinary)
- ✅ Database: Working (MongoDB Atlas)
- ✅ Email: Working (SendGrid)
- ✅ Authentication: Working (JWT)
- ✅ Real-time: Working (Socket.IO)
- ✅ Deployment: Ready (Render + Vercel)

---

## 🎉 Next Steps

1. **Deploy to production** using the guide above
2. **Test all features** with beta users
3. **Monitor performance** using Render/Railway dashboards
4. **Scale as needed** (upgrade plans when user base grows)

---

## 📞 Support

If you encounter issues:

1. Check the logs in your hosting platform dashboard
2. Verify all environment variables are set correctly
3. Ensure all free services are active and not in trial mode
4. Review the DEPLOYMENT.md file for additional troubleshooting

---

## ⚡ Performance Tips

- Use CDN for static assets (Vercel does this automatically)
- Enable Redis for better Socket.IO scaling (when needed)
- Monitor MongoDB Atlas storage usage (512MB free tier)
- Optimize images before upload (Cloudinary does this automatically)

---

**Your Genz Messenger system is now deployed — review `PRODUCTION_READINESS.md` before scaling to many users. 🚀**
