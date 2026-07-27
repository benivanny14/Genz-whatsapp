# TM WhatsApp - Modern Chat Application

A complete, production-ready WhatsApp-like web application built with React (frontend) and Node.js/Express (backend) with real-time messaging via Socket.io.

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
- **AI Chat Assistant**: Built-in AI assistant for help
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
- JWT authentication
- Protected routes
- Input validation & sanitization
- Rate limiting (anti-spam)
- XSS protection
- Secure API design
- Password hashing with bcrypt

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone the repository

```bash
cd GENZ
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
MONGODB_URI=mongodb://localhost:27017/tm-whatsapp
JWT_SECRET=tm-whatsapp-super-secret-key-2024-change-in-production
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

The frontend will start on `http://localhost:5173`

### Step 4: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
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

**AI Assistant**: Type `/ai` followed by your question to get AI assistance

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

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout user
- `PUT /api/auth/settings` - Update settings

### Chat
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversations/:id` - Get single conversation
- `POST /api/chat/conversation` - Create/get one-to-one conversation
- `POST /api/chat/groups` - Create group
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/messages` - Send message
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message
- `POST /api/chat/messages/:id/reactions` - Add reaction
- `DELETE /api/chat/messages/:id/reactions` - Remove reaction
- `GET /api/chat/users/search` - Search users
- `POST /api/chat/contacts` - Add contact
- `GET /api/chat/contacts` - Get contacts

### Media
- `POST /api/media/upload` - Upload single file
- `POST /api/media/upload-multiple` - Upload multiple files

### Advanced Features
- `POST /api/advanced/ai-assistant` - AI assistant
- `POST /api/advanced/translate` - Translate message
- `POST /api/advanced/schedule-message` - Schedule message
- `GET /api/advanced/scheduled-messages` - Get scheduled messages
- `POST /api/advanced/status` - Create status
- `GET /api/advanced/status` - Get statuses
- `POST /api/advanced/broadcast` - Create broadcast
- `GET /api/advanced/broadcast` - Get broadcasts
- `PUT /api/advanced/conversations/:id/disappearing-messages` - Set disappearing messages
- `GET /api/advanced/search-messages` - Search messages

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
- Check file size limits (max 100MB)
- Verify file type restrictions

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000                                    # Server port
MONGODB_URI=mongodb://localhost:27017/tm-whatsapp  # MongoDB connection string
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

This is a complete production-ready application. Feel free to extend it with additional features.

## 📄 License

MIT License

## 👤 Author

TM - Full Stack Developer

## 🙏 Acknowledgments

- Inspired by WhatsApp and Telegram
- Built with React, Node.js, Express, MongoDB, Socket.io
- UI icons from Lucide React
- Styling with TailwindCSS
