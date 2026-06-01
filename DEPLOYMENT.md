# GENZ WhatsApp Deployment Guide

## Free Hosting Options (Recommended)

### Option 1: Render.com (Free Tier)
- **Backend**: Render Web Service (Free tier: 750 hours/month)
- **Frontend**: Vercel (Free tier: Unlimited)
- **Database**: MongoDB Atlas (Free tier: 512MB)
- **Media Storage**: Cloudinary (Free tier: 25GB/month)
- **Redis**: Redis Cloud (Free tier: 30MB) - Optional for single-instance

### Option 2: Railway.app (Free Tier)
- **Backend + Frontend**: Railway (Free tier: $5 credit/month)
- **Database**: MongoDB Atlas (Free tier: 512MB)
- **Media Storage**: Cloudinary (Free tier: 25GB/month)

### Option 3: Traditional VPS (Cheapest)
- **VPS**: DigitalOcean ($4/month) or Linode ($5/month)
- **Database**: MongoDB Atlas (Free tier: 512MB)
- **Media Storage**: Cloudinary (Free tier: 25GB/month)

## Free Services Setup

### 1. MongoDB Atlas (Free Tier)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create new cluster (Free tier)
4. Database Access → Create database user
5. Network Access → Add IP address (0.0.0.0/0 for cloud hosting)
6. Connect → Connect your application → Copy connection string
7. Update `MONGODB_URI` in `.env`

### 2. Cloudinary (Free Tier)
1. Go to https://cloudinary.com/users/register/free
2. Create free account
3. Dashboard → API Keys
4. Copy Cloud name, API Key, API Secret
5. Update in `.env`:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### 3. Redis Cloud (Optional - Free Tier)
1. Go to https://redis.com/try-free/
2. Create free account
3. Create new database
4. Copy connection string
5. Update `REDIS_URL` in `.env`

### 4. SMTP for Email (Free Options)
- **SendGrid**: https://sendgrid.com/free/ (100 emails/day)
- **Mailgun**: https://www.mailgun.com/ (5,000 emails/month trial)
- **Gmail**: Enable "Less secure apps" (Not recommended for production)

## Prerequisites for Traditional VPS

- Node.js 18+ and npm
- MongoDB 4.4+ (local or remote)
- Nginx or Apache web server
- PM2 (for process management)
- SSL certificate (Let's Encrypt recommended)

## Environment Variables

### Backend (.env)

Copy `.env.example` to `.env` and configure:

```bash
# Required
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/genz-whatsapp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
FRONTEND_URL=https://your-domain.com
PUBLIC_API_URL=https://your-domain.com

# Optional but recommended
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend (.env)

Copy `.env.example` to `.env` and configure:

```bash
VITE_API_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com
```

## Render.com Deployment (Free Tier)

### Step 1: Prepare Your Code
1. Push your code to GitHub
2. Ensure all environment variables are set in Render dashboard

### Step 2: Deploy Backend to Render
1. Go to https://render.com
2. Create free account
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: genz-whatsapp-backend
   - **Root Directory**: backend
   - **Build Command**: npm install
   - **Start Command**: npm start
   - **Environment Variables**: Add all from `.env.production`
6. Click "Deploy Web Service"

### Step 3: Deploy Frontend to Vercel
1. Go to https://vercel.com
2. Create free account
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure:
   - **Root Directory**: frontend
   - **Build Command**: npm run build
   - **Output Directory**: dist
   - **Environment Variables**:
     - `VITE_API_URL`: https://genz-whatsapp-backend.onrender.com
     - `VITE_SOCKET_URL`: https://genz-whatsapp-backend.onrender.com
6. Click "Deploy"

### Step 4: Update Environment Variables
After deployment, update the following in Render dashboard:
- `FRONTEND_URL`: Your Vercel URL
- `PUBLIC_API_URL`: Your Render backend URL

### Step 5: Verify Deployment
- Frontend: Your Vercel URL
- Backend API: https://genz-whatsapp-backend.onrender.com/api/health
- Socket.IO: https://genz-whatsapp-backend.onrender.com/socket.io

## Traditional VPS Deployment Steps

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd GENZ-Whatsapp
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Build Frontend

```bash
cd frontend
npm run build
```

This creates a `dist` folder with production-ready files.

### 4. Configure Nginx

Copy `nginx.conf` to `/etc/nginx/sites-available/genz-whatsapp`:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/genz-whatsapp
sudo ln -s /etc/nginx/sites-available/genz-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Update `your-domain.com` in the config with your actual domain.

### 5. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6. Start Backend with PM2

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Deploy Frontend Files

```bash
# Copy build files to nginx directory
sudo cp -r frontend/dist/* /var/www/genz-whatsapp/frontend/dist/
sudo chown -R www-data:www-data /var/www/genz-whatsapp
```

### 8. Verify Deployment

- Frontend: https://your-domain.com
- Backend API: https://your-domain.com/api/health
- Socket.IO: https://your-domain.com/socket.io

## Local Production Stack (Docker)

For local testing with Docker:

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

## MongoDB Production Configuration

For production MongoDB, use:

```javascript
// In backend/config/production.js
const { connectProduction } = require('./config/production');
connectProduction();
```

Connection options include:
- Connection pooling (max 50 connections)
- Retry logic for read/write operations
- SSL/TLS support
- Performance tuning

## Security Features

- **CORS**: Configured for production with strict origin checking
- **Rate Limiting**: Different limits for auth (5/15min), API (100/15min), strict (10/hour)
- **Helmet**: Security headers including CSP, HSTS, XSS protection
- **MongoDB Sanitization**: NoSQL injection protection
- **Input Validation**: Express-validator for all inputs
- **E2E Encryption**: X25519/Ed25519/AES-256-GCM

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
pm2 logs genz-whatsapp-backend
pm2 restart genz-whatsapp-backend
```

### Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Backup Strategy

### MongoDB Backup

```bash
mongodump --uri="mongodb://localhost:27017/genz-whatsapp" --out=/backup/mongodb
```

### Automated Backup (Cron)

```bash
0 2 * * * mongodump --uri="mongodb://localhost:27017/genz-whatsapp" --out=/backup/mongodb/$(date +\%Y\%m\%d)
```

## Scaling

### Horizontal Scaling

1. Use Redis for Socket.IO scaling
2. Set `REDIS_URL` in environment variables
3. Configure load balancer (nginx)
4. Run multiple backend instances with PM2 cluster mode

### Vertical Scaling

- Increase MongoDB memory
- Use SSD storage
- Increase PM2 max_memory_restart

## Troubleshooting

### Frontend Not Loading

1. Check nginx configuration: `sudo nginx -t`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify build files exist in `/var/www/genz-whatsapp/frontend/dist/`

### Backend Not Responding

1. Check PM2 status: `pm2 status`
2. Check backend logs: `pm2 logs genz-whatsapp-backend`
3. Verify MongoDB connection: `pm2 describe genz-whatsapp-backend`

### Socket.IO Connection Issues

1. Check CORS configuration in server.js
2. Verify WebSocket support in nginx
3. Check Redis connection if using distributed setup

### Database Connection Issues

1. Verify MongoDB is running: `sudo systemctl status mongod`
2. Check MONGODB_URI in .env
3. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

## Updates

### Backend Update

```bash
cd backend
git pull
npm install
pm2 restart genz-whatsapp-backend
```

### Frontend Update

```bash
cd frontend
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/genz-whatsapp/frontend/dist/
sudo systemctl reload nginx
```

## Support

For issues, check:
- PM2 logs
- Nginx logs
- MongoDB logs
- Application logs in backend/logs/
