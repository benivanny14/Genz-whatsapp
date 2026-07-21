# Mwongozo wa Uingizaji wa Vipengele Mpya - Genz-whatsapp

## Muhtasari
Hii ni mwongozo kamili wa jinsi ya kuunganisha vipengele vipya vilivyotekelezwa kutoka WhatsApp Android kwenye mfumo wako wa Genz-whatsapp.

---

## Vipengele Vilivyotekelezwa

### 1. Location Sharing (Kushiriki Mahali)

**Faili Mpya:** `frontend/src/components/LocationPicker.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx au Chat.jsx
import LocationPicker from '../components/LocationPicker';

// Katika component yako
const [showLocationPicker, setShowLocationPicker] = useState(false);

// Katika JSX yako
{showLocationPicker && (
  <LocationPicker
    onClose={() => setShowLocationPicker(false)}
    onLocationSelect={(locationData) => {
      // Tuma data ya mahali kwa backend
      socket.emit('sendLocation', {
        chatId: selectedChat._id,
        ...locationData
      });
    }}
    currentUser={user}
    selectedChat={selectedChat}
  />
)}

// Ongeza kitufe cha kufungua LocationPicker
<button onClick={() => setShowLocationPicker(true)}>
  <MapPin size={20} />
  Share Location
</button>
```

**Mahitaji:**
- OpenStreetMap Nominatim API (bure)
- Geolocation API ya browser

**Mipangilio ya Backend:**
```javascript
// Katika socket.js au chatService.js
socket.on('sendLocation', async (data) => {
  const message = {
    type: 'location',
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    timestamp: data.timestamp,
    isLiveLocation: data.type === 'live_location',
    duration: data.duration
  };
  // Hifadhi ujumbe kwenye database
  await saveMessage(message);
});
```

---

### 2. View Once Messages (Ujumbe wa Angalia Mara Moja)

**Faili Mpya:** `frontend/src/components/ViewOnceMessage.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import ViewOnceMessage, { ViewOnceSettings } from '../components/ViewOnceMessage';

// Katika component yako
const handleViewOnceViewed = (messageId) => {
  // Futa ujumbe kutoka database
  socket.emit('deleteMessage', { messageId });
  // Ongeza alama ya kuwa imeangaliwa
  setMessages(prev => prev.map(msg => 
    msg._id === messageId ? { ...msg, viewed: true } : msg
  ));
};

// Katika JSX yako - onyesha kwa ujumbe wa view once
{message.viewOnce && !message.viewed && (
  <ViewOnceMessage
    message={message}
    onViewed={handleViewOnceViewed}
    onClose={() => {/* Funga modal */}}
  />
)}

// Katika Settings.jsx
<ViewOnceSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya Message
const messageSchema = new Schema({
  viewOnce: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  viewOnceTimer: { type: Number, default: 10 }, // sekunde
  // ... fields nyingine
});

// Endpoint ya kufuta ujumbe
app.delete('/api/messages/:id', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
```

---

### 3. Ephemeral Messages (Ujumbe wa Kufa)

**Faili Mpya:** `frontend/src/components/EphemeralMessage.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import EphemeralMessage, { EphemeralSettings, ChatEphemeralSettings } from '../components/EphemeralMessage';

// Katika component yako
const handleTimerSet = (messageId, duration) => {
  socket.emit('setDisappearingTimer', {
    messageId,
    duration,
    disappearingTimestamp: Date.now() + duration * 1000
  });
};

// Katika JSX yako - ongeza kwenye kila ujumbe
<EphemeralMessage
  message={message}
  onTimerSet={handleTimerSet}
  onTimerChange={(messageId, newDuration) => {
    // Badilisha timer
  }}
/>

// Katika ChatInfo.jsx
<ChatEphemeralSettings
  chat={selectedChat}
  onTimerSet={(chatId, duration) => {
    socket.emit('setChatDisappearingTimer', { chatId, duration });
  }}
/>

// Katika Settings.jsx
<EphemeralSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya Message
const messageSchema = new Schema({
  disappearingTimer: { type: Number, default: 0 },
  disappearingTimestamp: { type: Date },
  // ... fields nyingine
});

// Cron job ya kufuta ujumbe zilizoisha muda
cron.schedule('* * * * *', async () => {
  const now = new Date();
  await Message.deleteMany({
    disappearingTimestamp: { $lt: now }
  });
});
```

---

### 4. Community Features (Vipengele za Jumuiya)

**Faili Mpya:** `frontend/src/components/CommunityManager.jsx`

**Uingizaji:**

```jsx
// Katika Sidebar.jsx au Chat.jsx
import CommunityManager, { CommunityGroup } from '../components/CommunityManager';

// Katika component yako
const [showCommunityManager, setShowCommunityManager] = useState(false);

// Katika JSX yako
{showCommunityManager && (
  <CommunityManager
    onClose={() => setShowCommunityManager(false)}
    onCreateCommunity={(community) => {
      socket.emit('createCommunity', community);
    }}
    onJoinCommunity={(communityId) => {
      socket.emit('joinCommunity', { communityId });
    }}
  />
)}

// Ongeza kitufe cha jumuiya
<button onClick={() => setShowCommunityManager(true)}>
  <Users size={20} />
  Communities
</button>

// Katika sidebar - onyesha vikundi vya jumuiya
{communities.map(community => (
  <CommunityGroup
    key={community.id}
    community={community}
    onGroupClick={(group) => {
      // Fungua kundi
    }}
  />
))}
```

**Mipangilio ya Backend:**
```javascript
// Schema ya Community
const communitySchema = new Schema({
  name: String,
  description: String,
  icon: String,
  isPublic: Boolean,
  memberCount: Number,
  groupCount: Number,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

// Schema ya CommunityGroup
const communityGroupSchema = new Schema({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
  name: String,
  memberCount: Number
});

// Endpoints
app.post('/api/communities', createCommunity);
app.post('/api/communities/:id/join', joinCommunity);
app.get('/api/communities', getCommunities);
```

---

### 5. Advanced Business Features (Vipengele vya Biashara)

**Faili Mpya:** `frontend/src/components/BusinessProfileManager.jsx`

**Uingizaji:**

```jsx
// Katika Profile.jsx au Settings.jsx
import BusinessProfileManager, { OrderManager, BusinessAnalytics } from '../components/BusinessProfileManager';

// Katika component yako
const [showBusinessProfile, setShowBusinessProfile] = useState(false);
const [businessProfile, setBusinessProfile] = useState(null);

// Katika JSX yako
{showBusinessProfile && (
  <BusinessProfileManager
    businessProfile={businessProfile}
    onUpdate={(updatedProfile) => {
      socket.emit('updateBusinessProfile', updatedProfile);
      setBusinessProfile(updatedProfile);
    }}
    onClose={() => setShowBusinessProfile(false)}
  />
)}

// Katika dashboard ya biashara
<OrderManager
  orders={orders}
  onUpdateOrder={(orderId, status) => {
    socket.emit('updateOrderStatus', { orderId, status });
  }}
  onCreateOrder={(order) => {
    socket.emit('createOrder', order);
  }}
/>

<BusinessAnalytics data={analyticsData} />
```

**Mipangilio ya Backend:**
```javascript
// Schema ya BusinessProfile
const businessProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  businessName: String,
  category: String,
  description: String,
  address: String,
  email: String,
  phone: String,
  website: String,
  hours: String,
  products: [{
    name: String,
    price: Number,
    description: String,
    image: String,
    category: String
  }],
  isVerified: { type: Boolean, default: false }
});

// Schema ya Order
const orderSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User' },
  businessId: { type: Schema.Types.ObjectId, ref: 'BusinessProfile' },
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
  createdAt: { type: Date, default: Date.now }
});
```

---

### 6. Advanced AI Features (Vipengele vya AI)

**Faili Mpya:** `frontend/src/components/MetaAIAssistant.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import MetaAIAssistant, { AISettings } from '../components/MetaAIAssistant';

// Katika component yako
const [showAIAssistant, setShowAIAssistant] = useState(false);

// Katika JSX yako
{showAIAssistant && (
  <MetaAIAssistant
    onClose={() => setShowAIAssistant(false)}
    chatContext={messages}
    currentUser={user}
  />
)}

// Ongeza kitufe cha AI
<button onClick={() => setShowAIAssistant(true)}>
  <Bot size={20} />
  Meta AI
</button>

// Katika Settings.jsx
<AISettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Kwa ajili ya ujumbe wa AI, unahitaji API ya AI
// Unaweza kutumia OpenAI API, Google Cloud AI, n.k.

app.post('/api/ai/generate', async (req, res) => {
  const { prompt, capability } = req.body;
  
  // Piga simu kwa API ya AI
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  
  res.json({ response: response.choices[0].message.content });
});
```

---

### 7. Voice Transcription (Uandishi wa Sauti)

**Faili Mpya:** `frontend/src/components/VoiceTranscription.jsx`

**Uingizaji:**

```jsx
// Katika VoiceMessageBubble.jsx au ChatArea.jsx
import VoiceTranscription, { TranscriptionSettings, RealTimeTranscription } from '../components/VoiceTranscription';

// Katika component yako
const [showTranscription, setShowTranscription] = useState(false);

// Katika JSX yako - kwa kila ujumbe wa sauti
{message.type === 'voice' && (
  <VoiceTranscription
    audioUrl={message.mediaUrl}
    onTranscriptionComplete={(transcription) => {
      socket.emit('saveTranscription', {
        messageId: message._id,
        transcription
      });
    }}
    language="sw" // Swahili
  />
)}

// Kwa uandishi wa wakati halisi
<RealTimeTranscription
  isRecording={isRecording}
  onTranscriptUpdate={(transcript) => {
    setLiveTranscript(transcript);
  }}
/>

// Katika Settings.jsx
<TranscriptionSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Schema ya Message - ongeza transcription field
const messageSchema = new Schema({
  transcription: String,
  transcriptionLanguage: String,
  // ... fields nyingine
});

// Endpoint ya transcription
app.post('/api/transcribe', async (req, res) => {
  const { audioUrl, language } = req.body;
  
  // Tumia OpenAI Whisper, Google Speech-to-Text, n.k.
  const transcription = await transcribeAudio(audioUrl, language);
  
  res.json({ transcription });
});
```

---

### 8. Video Playback (Uchezaji wa Video)

**Faili Mpya:** `frontend/src/components/VideoPlayer.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import VideoPlayer, { VideoMessage, VideoGallery } from '../components/VideoPlayer';

// Katika component yako
const [showVideoPlayer, setShowVideoPlayer] = useState(false);
const [selectedVideo, setSelectedVideo] = useState(null);

// Katika JSX yako - kwa kila ujumbe wa video
{message.type === 'video' && (
  <VideoMessage
    message={message}
    onPlay={(video) => {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    }}
  />
)}

// Video player modal
{showVideoPlayer && selectedVideo && (
  <VideoPlayer
    videoUrl={selectedVideo.mediaUrl}
    onClose={() => {
      setShowVideoPlayer(false);
      setSelectedVideo(null);
    }}
    onDownload={() => {
      // Pakua video
    }}
    onShare={() => {
      // Shiriki video
    }}
    autoPlay
  />
)}

// Katika MediaGallery.jsx - ongeza sehemu ya video
<VideoGallery
  videos={videos.filter(v => v.type === 'video')}
  onSelectVideo={(video) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  }}
  onDownload={handleDownload}
  onShare={handleShare}
/>
```

**Mahitaji:**
- Hakuna mahitaji maalum - hutumia HTML5 video element

---

### 9. Chat Lock (Kufunga Mazungumzo)

**Faili Mpya:** `frontend/src/components/ChatLock.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import ChatLock, { ChatLockSettings, LockedChatPlaceholder } from '../components/ChatLock';

// Katika component yako
const handleLockChat = (chatId, lockData) => {
  socket.emit('lockChat', { chatId, lockData });
};

const handleUnlockChat = (chatId) => {
  socket.emit('unlockChat', { chatId });
};

// Katika JSX yako - ongeza kwenye chat header
<ChatLock
  chat={selectedChat}
  isLocked={selectedChat.isLocked}
  onLockChat={handleLockChat}
  onUnlockChat={handleUnlockChat}
/>

// Katika Chat.jsx - onyesha placeholder kwa chat iliyofungwa
{selectedChat.isLocked && !isUnlocked && (
  <LockedChatPlaceholder
    chat={selectedChat}
    onUnlock={() => setIsUnlocked(true)}
  />
)}

// Katika Settings.jsx
<ChatLockSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya Chat
const chatSchema = new Schema({
  isLocked: { type: Boolean, default: false },
  lockType: { type: String, enum: ['pin', 'fingerprint'] },
  lockPin: String,
  lockDuration: String,
  // ... fields nyingine
});

// Endpoint ya kufunga chat
app.post('/api/chats/:id/lock', async (req, res) => {
  const { type, pin, duration } = req.body;
  await Chat.findByIdAndUpdate(req.params.id, {
    isLocked: true,
    lockType: type,
    lockPin: pin,
    lockDuration: duration
  });
  res.json({ success: true });
});
```

---

### 10. Message Translation (Tafsiri ya Ujumbe)

**Faili Mpya:** `frontend/src/components/MessageTranslation.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import MessageTranslation, { AutoTranslation, TranslationSettings } from '../components/MessageTranslation';

// Katika component yako
const handleTranslate = (messageId, language, translatedText) => {
  socket.emit('saveTranslation', { messageId, language, translatedText });
};

// Katika JSX yako - ongeza kwenye kila ujumbe
<MessageTranslation
  message={message}
  onTranslate={handleTranslate}
  currentLanguage="sw"
/>

// Katika Settings.jsx
<TranslationSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya Message
const messageSchema = new Schema({
  translation: String,
  translationLanguage: String,
  // ... fields nyingine
});

// Endpoint ya tafsiri
app.post('/api/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;
  
  // Tumia Google Translate API, DeepL, n.k.
  const translation = await translateText(text, targetLanguage);
  
  res.json({ translation });
});
```

---

### 11. Mentions (Kutajwa)

**Faili Mpya:** `frontend/src/components/Mentions.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import Mentions, { MentionSettings, MentionNotification } from '../components/Mentions';

// Katika component yako
const handleMention = (userId, userName) => {
  // Ongeza mention kwenye ujumbe
  setMessageContent(prev => prev + `@${userName} `);
};

// Katika JSX yako - ongeza kwenye input area
<Mentions
  message={message}
  onMention={handleMention}
  chatParticipants={chatParticipants}
  currentUser={user}
/>

// Katika Settings.jsx
<MentionSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya Message
const messageSchema = new Schema({
  mentions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String
  }],
  // ... fields nyingine
});

// Endpoint ya kutuma arifa za mention
app.post('/api/mentions/notify', async (req, res) => {
  const { userId, messageId, chatId } = req.body;
  // Tuma arifa kwa mtumiaji aliyetajwa
  await sendNotification(userId, 'You were mentioned in a chat');
  res.json({ success: true });
});
```

---

### 12. QR Code (Kodi ya QR)

**Faili Mpya:** `frontend/src/components/QRCode.jsx`

**Uingizaji:**

```jsx
// Katika Profile.jsx
import { QRCodeGenerator, QRCodeScanner, QRCodeSettings } from '../components/QRCode';

// Katika component yako
const [showQRGenerator, setShowQRGenerator] = useState(false);
const [showQRScanner, setShowQRScanner] = useState(false);

// Katika JSX yako - kwa profile
{showQRGenerator && (
  <QRCodeGenerator
    data={{ userId: user._id, phone: user.phone, name: user.name }}
    type="profile"
    onClose={() => setShowQRGenerator(false)}
  />
)}

<button onClick={() => setShowQRGenerator(true)}>
  <QrCode size={20} />
  My QR Code
</button>

// Kwa kuscan QR code
{showQRScanner && (
  <QRCodeScanner
    onScan={(result) => {
      // Shughulikia matokeo ya scan
      console.log('Scanned:', result);
      setShowQRScanner(false);
    }}
    onClose={() => setShowQRScanner(false)}
  />
)}

// Katika Settings.jsx
<QRCodeSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mahitaji:**
- `qrcode.react` package kwa ajili ya kuzalisha QR codes

**Mipangilio ya Backend:**
```javascript
// Hakuna mipangilio maalum ya backend inayohitajika
// QR code data inahifadhiwa kwenye frontend
```

---

### 13. Reminders (Kumbukumbu)

**Faili Mpya:** `frontend/src/components/Reminders.jsx`

**Uingizaji:**

```jsx
// Katika ChatArea.jsx
import Reminders, { RemindersList, ReminderSettings, ReminderNotification } from '../components/Reminders';

// Katika component yako
const handleSetReminder = (reminder) => {
  socket.emit('setReminder', reminder);
};

// Katika JSX yako - ongeza kwenye kila ujumbe
<Reminders
  message={message}
  onSetReminder={handleSetReminder}
/>

// Katika Settings.jsx
<ReminderSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Schema ya Reminder
const reminderSchema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  reminderTime: Date,
  reminderDate: Date,
  note: String,
  repeat: String,
  completed: { type: Boolean, default: false }
});

// Cron job ya kuangalia reminders
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const dueReminders = await Reminder.find({
    reminderTime: { $lte: now },
    completed: false
  });
  
  // Tuma arifa kwa reminders zilizofika
  dueReminders.forEach(reminder => {
    sendNotification(reminder.userId, 'Reminder: ' + reminder.note);
  });
});
```

---

### 14. Last Seen (Iliyona Mwisho)

**Faili Mpya:** `frontend/src/components/LastSeen.jsx`

**Uingizaji:**

```jsx
// Katika ContactInfo.jsx
import LastSeen, { LastSeenSettings, OnlineStatus } from '../components/LastSeen';

// Katika component yako
const handlePrivacyChange = (setting, value) => {
  socket.emit('updatePrivacy', { setting, value });
};

// Katika JSX yako - kwa kila mawasiliano
<LastSeen
  user={contact}
  privacySettings={contact.privacySettings}
  onPrivacyChange={handlePrivacyChange}
/>

// Katika Settings.jsx
<LastSeenSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Katika schema ya User
const userSchema = new Schema({
  lastSeen: Date,
  isOnline: { type: Boolean, default: false },
  privacySettings: {
    lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    showOnlineStatus: { type: Boolean, default: true }
  }
});

// Endpoint ya kuupdate last seen
app.post('/api/users/last-seen', async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    lastSeen: new Date(),
    isOnline: true
  });
  res.json({ success: true });
});
```

---

### 15. Invite Links (Viungo vya Mwaliko)

**Faili Mpya:** `frontend/src/components/InviteLinks.jsx`

**Uingizaji:**

```jsx
// Katika GroupInfo.jsx
import InviteLinks, { InviteLinkList, InviteLinkSettings } from '../components/InviteLinks';

// Katika component yako
const [showInviteLinks, setShowInviteLinks] = useState(false);

const handleGenerateLink = (chatId, linkData) => {
  socket.emit('generateInviteLink', { chatId, linkData });
};

const handleRevokeLink = (chatId) => {
  socket.emit('revokeInviteLink', { chatId });
};

// Katika JSX yako
{showInviteLinks && (
  <InviteLinks
    chat={selectedChat}
    onGenerateLink={handleGenerateLink}
    onRevokeLink={handleRevokeLink}
    onClose={() => setShowInviteLinks(false)}
  />
)}

<button onClick={() => setShowInviteLinks(true)}>
  <Link size={20} />
  Invite Link
</button>

// Katika Settings.jsx
<InviteLinkSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Schema ya InviteLink
const inviteLinkSchema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  code: String,
  url: String,
  createdAt: Date,
  expiresAt: Date,
  maxJoins: Number,
  currentJoins: { type: Number, default: 0 },
  requireApproval: { type: Boolean, default: false }
});

// Endpoint ya kuzalisha link
app.post('/api/chats/:id/invite-link', async (req, res) => {
  const link = await InviteLink.create({
    chatId: req.params.id,
    code: generateCode(),
    url: `https://wa.me/join/${generateCode()}`,
    ...req.body
  });
  res.json(link);
});
```

---

### 16. Account Management (Usimamizi wa Akaunti)

**Faili Mpya:** `frontend/src/components/AccountManagement.jsx`

**Uingizaji:**

```jsx
// Katika Settings.jsx
import AccountManagementSettings, { AccountDelete, AccountLinking, AccountSync } from '../components/AccountManagement';

// Katika component yako
const handleDeleteAccount = (data) => {
  socket.emit('deleteAccount', data);
};

// Katika JSX yako
<AccountManagementSettings
  settings={settings}
  onUpdate={(newSettings) => setSettings(newSettings)}
/>
```

**Mipangilio ya Backend:**
```javascript
// Endpoint ya kufuta akaunti
app.delete('/api/account', async (req, res) => {
  // Futa data yote ya mtumiaji
  await User.findByIdAndDelete(req.user._id);
  await Message.deleteMany({ senderId: req.user._id });
  await Chat.deleteMany({ participants: req.user._id });
  res.json({ success: true });
});

// Schema ya LinkedAccount
const linkedAccountSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: String,
  email: String,
  phone: String,
  linkedAt: Date
});

// Schema ya AccountSync
const accountSyncSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  autoSync: Boolean,
  syncFrequency: String,
  wifiOnly: Boolean,
  syncContacts: Boolean,
  syncChats: Boolean,
  lastSync: Date
});
```

---

## Mipangilio ya Jumla

### 1. Dependencies Zinazohitajika

Dependencies mpya zinazohitajika:
- `qrcode.react` - Kwa ajili ya kuzalisha QR codes
- `qrcode.react` package: `npm install qrcode.react`

Libraries zilizopo:
- React
- Framer Motion
- Lucide React (icons)

### 2. Mipangilio ya Socket

Ongeza event handlers zifuatazo kwenye `socket.js`:

```javascript
// Location events
socket.on('sendLocation', handleSendLocation);
socket.on('locationReceived', handleLocationReceived);

// View once events
socket.on('deleteMessage', handleDeleteMessage);

// Ephemeral events
socket.on('setDisappearingTimer', handleSetDisappearingTimer);
socket.on('setChatDisappearingTimer', handleSetChatDisappearingTimer);

// Community events
socket.on('createCommunity', handleCreateCommunity);
socket.on('joinCommunity', handleJoinCommunity);

// Business events
socket.on('updateBusinessProfile', handleUpdateBusinessProfile);
socket.on('createOrder', handleCreateOrder);
socket.on('updateOrderStatus', handleUpdateOrderStatus);

// AI events
socket.on('aiResponse', handleAIResponse);

// Transcription events
socket.on('saveTranscription', handleSaveTranscription);

// Chat Lock events
socket.on('lockChat', handleLockChat);
socket.on('unlockChat', handleUnlockChat);

// Translation events
socket.on('saveTranslation', handleSaveTranslation);

// Mention events
socket.on('mentionUser', handleMentionUser);

// Reminder events
socket.on('setReminder', handleSetReminder);

// Last Seen events
socket.on('updateLastSeen', handleUpdateLastSeen);

// Invite Link events
socket.on('generateInviteLink', handleGenerateInviteLink);
socket.on('revokeInviteLink', handleRevokeInviteLink);

// Account Management events
socket.on('deleteAccount', handleDeleteAccount);
socket.on('linkAccount', handleLinkAccount);
socket.on('unlinkAccount', handleUnlinkAccount);
socket.on('syncAccount', handleSyncAccount);
```

### 3. Mipangilio ya Database

Ongeza schemas zifuatazo kwenye backend:

```javascript
// Location
const locationSchema = new Schema({
  latitude: Number,
  longitude: Number,
  address: String,
  isLiveLocation: Boolean,
  duration: Number,
  timestamp: Date
});

// Community
const communitySchema = new Schema({
  name: String,
  description: String,
  icon: String,
  isPublic: Boolean,
  memberCount: Number,
  groupCount: Number
});

// Business Profile
const businessProfileSchema = new Schema({
  businessName: String,
  category: String,
  description: String,
  address: String,
  email: String,
  phone: String,
  website: String,
  hours: String,
  products: Array,
  isVerified: Boolean
});

// Order
const orderSchema = new Schema({
  customerId: ObjectId,
  businessId: ObjectId,
  items: Array,
  total: Number,
  status: String,
  createdAt: Date
});

// Chat Lock
const chatLockSchema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  isLocked: { type: Boolean, default: false },
  lockType: { type: String, enum: ['pin', 'fingerprint'] },
  lockPin: String,
  lockDuration: String
});

// Translation
const translationSchema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  translation: String,
  translationLanguage: String,
  translatedAt: Date
});

// Mention
const mentionSchema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  mentions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String
  }]
});

// Reminder
const reminderSchema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  reminderTime: Date,
  reminderDate: Date,
  note: String,
  repeat: String,
  completed: { type: Boolean, default: false }
});

// Last Seen
const lastSeenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  lastSeen: Date,
  isOnline: { type: Boolean, default: false },
  privacySettings: {
    lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    showOnlineStatus: { type: Boolean, default: true }
  }
});

// Invite Link
const inviteLinkSchema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  code: String,
  url: String,
  createdAt: Date,
  expiresAt: Date,
  maxJoins: Number,
  currentJoins: { type: Number, default: 0 },
  requireApproval: { type: Boolean, default: false }
});

// Linked Account
const linkedAccountSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: String,
  email: String,
  phone: String,
  linkedAt: Date
});

// Account Sync
const accountSyncSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  autoSync: Boolean,
  syncFrequency: String,
  wifiOnly: Boolean,
  syncContacts: Boolean,
  syncChats: Boolean,
  lastSync: Date
});
```

### 4. Mipangilio ya Settings

Ongeza fields zifuatazo kwenye schema ya UserSettings:

```javascript
const userSettingsSchema = new Schema({
  // ... fields zilizopo
  
  // View once settings
  viewOnceEnabled: { type: Boolean, default: true },
  viewOnceTimer: { type: Number, default: 10 },
  screenshotWarning: { type: Boolean, default: true },
  
  // Ephemeral settings
  ephemeralEnabled: { type: Boolean, default: true },
  defaultTimer: { type: Number, default: 86400 },
  autoDeleteMedia: { type: Boolean, default: true },
  showTimerInChat: { type: Boolean, default: true },
  
  // AI settings
  aiEnabled: { type: Boolean, default: true },
  autoSuggest: { type: Boolean, default: false },
  smartSummaries: { type: Boolean, default: false },
  autoTranslate: { type: Boolean, default: false },
  defaultLanguage: { type: String, default: 'en' },
  
  // Transcription settings
  autoTranscribe: { type: Boolean, default: false },
  defaultLanguage: { type: String, default: 'en' },
  autoSaveTranscriptions: { type: Boolean, default: true },
  showTranscriptionInChat: { type: Boolean, default: true },
  
  // Chat Lock settings
  chatLockEnabled: { type: Boolean, default: true },
  defaultLockType: { type: String, default: 'pin' },
  autoLock: { type: Boolean, default: false },
  hideLockedContent: { type: Boolean, default: true },
  
  // Translation settings
  autoTranslate: { type: Boolean, default: false },
  translationLanguage: { type: String, default: 'en' },
  translationProvider: { type: String, default: 'google' },
  cacheTranslations: { type: Boolean, default: true },
  
  // Mention settings
  allowMentions: { type: Boolean, default: true },
  mentionNotifications: { type: Boolean, default: true },
  mentionSound: { type: Boolean, default: true },
  mentionPrivacy: { type: String, default: 'everyone' },
  
  // QR Code settings
  qrCodeEnabled: { type: Boolean, default: true },
  showQRInProfile: { type: Boolean, default: true },
  autoScanQR: { type: Boolean, default: false },
  
  // Reminder settings
  remindersEnabled: { type: Boolean, default: true },
  reminderSound: { type: Boolean, default: true },
  reminderVibration: { type: Boolean, default: true },
  defaultSnooze: { type: Number, default: 5 },
  
  // Last Seen settings
  lastSeenEnabled: { type: Boolean, default: true },
  lastSeenPrivacy: { type: String, default: 'everyone' },
  showOnlineStatus: { type: Boolean, default: true },
  
  // Invite Link settings
  inviteLinksEnabled: { type: Boolean, default: true },
  whoCanCreateLinks: { type: String, default: 'admins' },
  requireApproval: { type: Boolean, default: false },
  defaultExpiration: { type: String, default: 'never' },
  
  // Account Management settings
  linkedAccounts: [linkedAccountSchema],
  syncSettings: accountSyncSchema
});
```

---

## Maelekezo ya Hatua kwa Hatua

### Hatua ya 1: Weka Faili Mpya
1. Copy faili zote 16 mpya kwenye `frontend/src/components/`
2. Hakikisha faili ziko kwenye saraka sahihi
3. Install dependency mpya: `npm install qrcode.react`

### Hatua ya 2: Sasisha ChatArea.jsx
1. Import components mpya
2. Ongeza state variables
3. Ongeza event handlers
4. Ongeza JSX kwa vipengele vipya

### Hatua ya 3: Sasisha Settings.jsx
1. Import settings components
2. Ongeza kwenye sehemu sahihi ya settings
3. Ongeza handlers za onUpdate

### Hatua ya 4: Sasisha Backend
1. Ongeza schemas mpya (Chat Lock, Translation, Mention, Reminder, Last Seen, Invite Link, Linked Account, Account Sync)
2. Ongeza endpoints mpya
3. Sasisha socket handlers
4. Ongeza cron job kwa ephemeral messages na reminders

### Hatua ya 5: Jaribu
1. Anza frontend na backend
2. Jaribu kila kipengele kivyake
3. Angalia kama kuna hitilafu
4. Rekebisha kama inahitajika

---

## Matatizo Yawezekano na Suluhisho

### Matatizo ya 1: Import Hazifanyi Kazi
**Suluhisho:** Hakikisha path ya import ni sahihi na inalingana na muundo wa faili zako.

### Matatizo ya 2: Socket Events Hazifanyi Kazi
**Suluhisho:** Hakikisha event names zinafanana kati ya frontend na backend.

### Matatizo ya 3: Database Errors
**Suluhisho:** Hakikisha schemas zimeongezwa na database imesasishwa.

### Matatizo ya 4: UI Hazionekani Vizuri
**Suluhisho:** Angalia CSS classes na hakikisha zinafanana na theme yako.

---

## Hitimisho

Vipengele vipya 16 vimeundwa vizuri na vinaweza kuunganishwa kwenye mfumo wako wa Genz-whatsapp. Fuata mwongozo huu hatua kwa hatua na utakuwa na mfumo wenye vipengele zaidi na zenye ufanisi zaidi.

### Orodha ya Vipengele Vilivyotekelezwa:

1. Location Sharing (Kushiriki Mahali)
2. View Once Messages (Ujumbe wa Angalia Mara Moja)
3. Ephemeral Messages (Ujumbe wa Kufa)
4. Community Features (Vipengele za Jumuiya)
5. Advanced Business Features (Vipengele vya Biashara)
6. Advanced AI Features (Vipengele vya AI)
7. Voice Transcription (Uandishi wa Sauti)
8. Video Playback (Uchezaji wa Video)
9. Chat Lock (Kufunga Mazungumzo)
10. Message Translation (Tafsiri ya Ujumbe)
11. Mentions (Kutajwa)
12. QR Code (Kodi ya QR)
13. Reminders (Kumbukumbu)
14. Last Seen (Iliyona Mwisho)
15. Invite Links (Viungo vya Mwaliko)
16. Account Management (Usimamizi wa Akaunti)

Kwa msaada zaidi, tafuta faili `DETAILED_MISSING_FEATURES.md` kwa orodha kamili ya vipengele vilivyokosekana na `MISSING_FEATURES_ANALYSIS.md` kwa orodha ya awali.
