# Genz Messenger - Modern Chat Application

A WhatsApp-like web application built with React (frontend) and Node.js/Express (backend) with real-time messaging via Socket.io, plus a GENZ Mods layer (themes, anti-delete, bulk sender, etc.) and a manual mobile-money Premium payment flow.

## ⚠️ System Status

**Current status: Production-ready** — fully verified feature set for messaging, status, groups, and GENZ Mods.**

Verified (2026-08-29): backend syntax check passes, backend route-export check passes, backend tests pass, frontend tests pass, frontend build passes, and the Playwright e2e suite runs in CI.

Before onboarding many users, complete the checklist in `PRODUCTION_READINESS.md` (Cloudinary media storage, Redis, payment-process automation, npm audit cleanup).

The Android APK is built from this web app via **Capacitor** (`frontend/android` + `frontend/scripts/build-apk.js`) — there is no separate native codebase. (The old React Native prototype in `react-native/` was removed in v1.1.11; it was a static mock never connected to this backend.)

Note: Messages are encrypted in transit (TLS) and at rest on the server. There is no client-side end-to-end encryption (E2EE) in this app.

## 🚀 Features

### Core Features
- **Authentication System**: Sign up, login, logout with JWT authentication
- **Real-time Messaging**: Instant messaging with Socket.io
- **One-to-One Chat**: Private conversations between users
- **Group Chats**: Create, join, leave groups with admin roles
- **Online/Offline Status**: See who's online
- **Typing Indicators**: Real-time typing status
- **Message Status**: Sent, delivered, read receipts
- **Message Timestamps**: Accurate message timing
- **Delete Messages**: Delete for yourself or for everyone

### Media Support
- **Images**: Send and receive images
- **Videos**: Video sharing support
- **Audio**: Audio file sharing
- **Files**: Document and file sharing
- **Voice Notes**: Recording and playback
- **Emojis**: Full emoji support with picker
- **GIFs**: GIF sharing support

### Advanced Features
- **Message Translation**: Multi-language support
- **Message Scheduling**: Send messages later
- **Message Editing**: Edit messages after sending
- **Chat Themes**: Dark mode, custom colors, wallpapers
- **Disappearing Messages**: Self-destruct timer for messages
- **Chat Lock**: PIN/Fingerprint simulation
- **Smart Search**: Search messages, users, media
- **Message Reactions**: Like Instagram/Telegram style reactions
- **Status/Stories**: 24-hour posts
- **Broadcast Messages**: Send to multiple contacts at once

### Settings Panel
- **Profile Settings**: Name, photo, bio management
- **Privacy Settings**: Last seen, online status, read receipts
- **Notification Settings**: Customize notifications
- **Theme Customization**: Change app appearance
- **Security Settings**: PIN lock, session management
- **Data & Storage**: Manage storage settings
- **Feature Toggles**: Enable/disable any feature

### Security
- JWT authentication (short-lived 15m access tokens + rotating 7d refresh tokens)
- Protected routes & Socket.IO connections (JWT-required handshake)
- Input validation & sanitization
- Rate limiting (anti-spam, auth, security, and admin surfaces)
- Output encoding & input validation instead of brittle XSS stripping (xss-clean removed)
- Secure API design
- Password hashing with bcrypt/scrypt + strict password policy

## 🔐 Security Hardening (2026 audit)

The following hardening was applied to the backend:

**Authentication & sessions**
- Access tokens expire after **15 minutes**; refresh tokens after **7 days**.
- Refresh tokens are **rotated and single-use**: every refresh invalidates the previous token via a `refreshTokenVersion` counter on the user document (replay of a used refresh token is rejected).
- Strict password policy (min 12 chars + uppercase, lowercase, digit, special char) enforced on register, password change, and password reset — weak passwords are rejected outright.

**Socket.IO**
- **No more global broadcasts.** Status views/likes/comments, block/unblock, online/offline presence, live-stream events, and broadcast-list creation are all emitted to the specific users/rooms involved, never to every connected socket.
- Participant authorization added to typing, recording, edit/delete message, star/pin, archive/mute/lock, role, and join-group events.
- `update_status` is owner-only; custom roles are admin-only; join-by-invite requires admin approval flow for `requireJoinApproval` groups.
- Mass messages are capped (max 20 recipients) and rate-limited per user.
- Message deduplication moves to Redis when configured (shared across instances) with an in-memory fallback.

**Data & privacy**
- Delete-for-everyone **hard-deletes**: message content/media is scrubbed immediately and the document is removed after 30 days (server-side sweep is the restart-safe backstop).
- Account deletion erases the user's messages (`deleteMany`) and removes orphan self-chats.
- Profile-visitor tracking is **opt-in** (`trackProfileVisitors`) and visitor identity always comes from the authenticated session.
- `onlineHistory` entries expire after 30 days (cron-pruned; a TTL index is intentionally avoided on the array field).
- Group invite codes **expire after 7 days** and expired codes are rejected on both REST and socket join paths.
- Phone numbers are no longer returned in user search results.
- Settings updates are validated (invalid enum values rejected), and business website URLs are validated.

**Transport & media**
- `/uploads` is same-origin only (`Cross-Origin-Resource-Policy: same-origin`), no wildcard `Access-Control-Allow-Origin`, and remains behind signed-URL/JWT `secureUploads` middleware.
- Uploads are magic-byte verified (`file-type`) and production defaults cap upload size at 25MB.
- `trust proxy` defaults to **off** (explicit opt-in) to prevent IP spoofing.
- Global error handlers now `process.exit(1)` so the process manager restarts a corrupted process; rate-limiter failures fail **closed**.
- Legacy hardcoded secrets/fallbacks removed (`MESSAGE_ENCRYPTION_SECRET` is required; no phantom `LOCAL_USER_ID`/`DEFAULT_DEVICE_ID` users).

**Dependency audit (2026-08-11)**
- `npm audit`: **0 high / 0 critical**. 16 moderate advisories remain, all transitively from `artillery` (load-testing dev tool, via `@opentelemetry/*`); the only fix is a breaking `artillery@1.7.9` upgrade. Runtime dependencies are clean.
- Frontend `npm audit`: **0 vulnerabilities** after upgrading `vite@5` → `vite@8.2.1` (with `@vitejs/plugin-react@6`) — the previous 1 high + 1 moderate (`vite`/`esbuild`) are gone. Runtime dependencies are clean.

## 📋 Prerequisites

- **Node.js** (v20 LTS or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone the repository

```bash
cd Genz-whatsapp
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend directory (already created with default values):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/genz_whatsapp
JWT_SECRET=change-this-to-a-strong-random-string-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

## 🚀 Running the Application

### Step 1: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On Windows (if using MongoDB as service)
# MongoDB should be running automatically

# Or if using MongoDB locally
mongod
```

### Step 2: Start Backend Server

In the backend directory:

```bash
npm run dev
```

The backend will start on `http://localhost:5000`

### Step 3: Start Frontend Development Server

In the frontend directory (open a new terminal):

```bash
npm run dev
```

The frontend will start on `http://localhost:5174`

### Step 4: Access the Application

Open your browser and navigate to:

```
http://localhost:5174
```

## 📱 Usage

### First Time Setup

1. **Register**: Click "Sign up" and create a new account
2. **Login**: Enter your credentials to log in
3. **Start Chatting**: Use the "+" button to start a new conversation

### Creating Conversations

1. Click the "+" button in the sidebar
2. Search for users by username or email
3. Click on a user to start a conversation

### Creating Groups

1. Click "New Group" in the sidebar
2. Enter group name and description
3. Search and add participants (minimum 2)
4. Click "Create Group"

### Sending Messages

1. Select a conversation
2. Type your message in the input field
3. Press Enter or click the Send button
4. Use the attachment icons to send images, files, or emojis

### Advanced Features


**Message Translation**: Right-click on a message and select "Translate"

**Schedule Message**: Click the menu icon on a message and select "Schedule"

**Reactions**: Hover over a message and click an emoji to react

**Search**: Use the search bar to find messages, users, or conversations

### Settings

1. Click the menu icon (three dots) in the sidebar
2. Select "Settings"
3. Navigate through tabs: Profile, Privacy, Notifications, Appearance, Security

## 📁 Project Structure

```
GENZ/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── chatController.js     # Chat logic
│   │   ├── mediaController.js    # Media upload logic
│   │   └── advancedController.js # Advanced features logic
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   ├── upload.js             # File upload
│   │   └── validator.js          # Input validation
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── Message.js            # Message model
│   │   ├── Conversation.js       # Conversation model
│   │   ├── Status.js             # Status model
│   │   └── Broadcast.js          # Broadcast model
│   ├── routes/
│   │   ├── authRoutes.js         # Auth routes
│   │   ├── chatRoutes.js         # Chat routes
│   │   ├── mediaRoutes.js        # Media routes
│   │   └── advancedRoutes.js     # Advanced features routes
│   ├── socket/
│   │   └── index.js              # Socket.io setup
│   ├── uploads/
│   │   ├── images/
│   │   ├── videos/
│   │   ├── audio/
│   │   └── files/
│   ├── server.js                 # Main server file
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Chat sidebar
│   │   │   └── ChatArea.jsx      # Chat area
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Auth state management
│   │   │   └── ChatContext.jsx   # Chat state management
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Register.jsx      # Register page
│   │   │   ├── Chat.jsx          # Main chat page
│   │   │   ├── Settings.jsx      # Settings page
│   │   │   ├── NewChat.jsx       # New chat page
│   │   │   └── NewGroup.jsx      # New group page
│   │   ├── services/
│   │   │   ├── api.js            # API service
│   │   │   └── socket.js         # Socket service
│   │   ├── utils/
│   │   │   ├── cn.js             # Utility functions
│   │   │   └── formatDate.js     # Date formatting
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

Every public route is mounted under **both** `/api/...` (legacy, what the
current frontend calls) and `/api/v1/...` (versioned namespace — **new code
should use `/api/v1`**). Routes are declared once in `API_ROUTE_MOUNTS` in
`backend/server.js`, so adding a route there versions it for free. All
user-facing endpoints require a JWT (unless noted); responses default to
`Cache-Control: no-store`.

### Core
- `/api/auth` — register, login, refresh, logout, `/me`, profile, settings, OTP verification, blocked users, passkeys (WebAuthn)
- `/api/chat` — conversations, messages, groups, contacts, search, archive, block/unblock, reactions, pin/star, read receipts, disappearing messages
- `/api/media` — upload (single/multiple), delete, file info, signed URLs, transforms, thumbnails, cleanup
- `/api/advanced` — translate, schedule message, statuses, broadcast, search messages
- `/api/status` + `/api/status-advanced` — status posts, views, likes, comments, viewer lists
- `/api/voice` — voice/video notes
- `/api/notifications` — notification settings + web push subscriptions
- `/api/device` — linked devices (pair/unpair)
- `/api/security` — 2FA (TOTP), security settings, sessions
- `/api/settings` — WhatsApp-style settings get/update/reset
- `/api/privacy` — privacy permission system (excluded/allowed contacts per privacy type)
- `/api/contacts` — phone-book contacts sync
- `/api/communities` + `/api/groups` — communities + group invite links
- `/api/payments` + `/api/payment/manual` + `/api/admin/manual-payments` + `/api/payment-features` — Premium payment flow (manual mobile-money approval)
- `/api/products` — product catalog
- `/api/admin` — admin panel (obscured base path, see `ADMIN_BASE_PATH`)
- `/api/backup` — chat backup/restore
- `/api/stickers` — custom sticker packs
- `/api/channels` — broadcast channels
- `/api/telemetry` — opt-in client crash reporting
- `/api/location-sharing` — live location sharing

### GENZ Mods / feature toggles (all under `/api`, each returns settings + toggles)
- `/api/anti-revoke`, `/api/anti-ban` — anti-revoke (see deleted messages) + anti-ban
- `/api/privacy-mods`, `/api/media-mods`, `/api/customization-mods`, `/api/automation-mods`,
  `/api/security-mods`, `/api/chat-list-mods`, `/api/message-mods`, `/api/group-mods`,
  `/api/genz-mods` — per-feature MODs toggles
- `/api/chat-filter`, `/api/chat-sort`, `/api/chat-search`, `/api/chat-folders` — chat organization
- `/api/group-features`, `/api/status-features` — feature toggles
- `/api/text-repeater`, `/api/live-reactions`, `/api/story-highlights`,
  `/api/quick-actions`, `/api/chat-analyzer`, `/api/fake-chat`, `/api/gif-player` — feature toggles
- `/api/bulk-sender`, `/api/multi-accounts`, `/api/whatsapp-web` — WhatsApp session management
- `/api/business-account`, `/api/file-manager`, `/api/storage-manager`, `/api/data-usage`, `/api/cache-cleaner`
- `/api/media-compressor` (sharp/ffmpeg compression + stats), `/api/media-editor` (image/video/audio edit)
- `/api/theme-engine` — theme customization
- `/api/scheduled-messages` — dedicated scheduled-message routes

### Examples
- `POST /api/v1/auth/register` — register new user
- `POST /api/v1/auth/login` — login user
- `GET /api/v1/chat/conversations` — get all conversations
- `POST /api/v1/chat/messages` — send message
- `POST /api/v1/media/upload` — upload a file
- `GET /api/health` — service health (`mongo`/`redis`/`mediaStorage`); also `/api/v1/health`, `/api/health/live`, `/api/health/ready`

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent spam
- Input validation and sanitization
- XSS protection
- CORS configuration
- Protected API routes
- Secure file upload validation

## 🎨 UI/UX Features

- Modern WhatsApp + Telegram inspired design
- Fully responsive (mobile, tablet, desktop)
- Smooth animations
- Dark mode by default
- Clean and professional design
- Fast performance
- Intuitive navigation

## 🐛 Troubleshooting

### Backend won't start
- Ensure MongoDB is running
- Check if port 5000 is available
- Verify .env file configuration

### Frontend won't connect to backend
- Ensure backend is running on port 5000
- Check browser console for CORS errors
- Verify API_URL in frontend services

### Socket.io connection issues
- Ensure backend server is running
- Check firewall settings
- Verify socket.io client version compatibility

### File upload not working
- Ensure uploads directory exists
- Check file size limits (max 25MB)
- Verify file type restrictions

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000                                    # Server port
MONGODB_URI=mongodb://localhost:27017/genz_whatsapp  # MongoDB connection string
JWT_SECRET=your-secret-key                   # JWT secret key
JWT_EXPIRE=7d                                # Token expiration time
NODE_ENV=development                         # Environment mode
```

## 🚀 Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in .env
2. Change `JWT_SECRET` to a strong random string
3. Update `MONGODB_URI` to production MongoDB instance
4. Deploy to hosting service (Heroku, AWS, DigitalOcean, etc.)

### Frontend Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to hosting service (Vercel, Netlify, etc.)
3. Update API URL to production backend URL

## 🤝 Contributing

This is a production-ready messaging application. Feel free to extend it with additional features.

## 📄 License

MIT License

## 👤 Author

GENZ / TM - Full Stack Developer

## 🙏 Acknowledgments

- Inspired by WhatsApp and Telegram
- Built with React, Node.js, Express, MongoDB, Socket.io
- UI icons from Lucide React
- Styling with TailwindCSS
