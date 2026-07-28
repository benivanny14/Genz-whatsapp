# Genz WhatsApp - React Native APK

A comprehensive WhatsApp-like messaging application with advanced status features, built with React Native for Android.

## Features

### Core Features
- **Chat System**: Real-time messaging with text, images, videos, and audio
- **Status Updates**: Advanced status creation with multiple media types
- **Voice/Video Calls**: Integrated calling functionality
- **Explore Page**: Discovery of trending content and creators
- **Profile Management**: User settings and preferences

### Advanced Status Features
- GIF, Link, Music, Quiz, Question, Countdown, Location statuses
- Collage, Boomerang, Live Photo, Dual Camera, Timer Capture
- Camera Controls (Grid Lines, Level Indicator, Exposure, White Balance)
- Text Effects (Animation, 3D, Glow, Neon, Gradient, Pattern, Curve)
- Special Stickers (Custom, Time, Weather, Location, Hashtag, Mention, etc.)
- Drawing/Brush Tools (brush types, size, color, opacity, eraser, shapes)
- Crop/Rotate/Flip Tools with aspect ratios
- Filters (Vintage, B&W, HDR, Vignette, Grain, Light leak, Bokeh, Glitch, Neon, Cartoon, Sketch)
- Beauty/Face Retouch (teeth whitening, eye enlargement, face slim, etc.)
- Background Tools (blur, remove, replace, color, gradient, pattern, image, video)
- Video Tools (Speed control, Reverse, Trim, Split, Merge, Add music, Volume control, Fade in/out, Transitions, Text-to-Speech, Voice Changer)
- AR Filters and Face Filters
- Background Music, Voice Over, Sound Effects
- Subtitles, Translation, Auto-Caption
- AI-powered Suggestions (Hashtag, Location, Mention, Music)

### Status Viewing Features
- Mute Sound, Volume Control, Brightness Control
- Slide on Slider, Hide Viewer from List

### Status Privacy
- View Once, Disappearing After View
- Password/PIN/Fingerprint Protection
- Screenshot Detection, Anti-Screenshot

### Status Management
- Edit posted status, Repost, Insights
- Highlights with cover/title
- Close Friends + Badge
- Template + Customization

### Chat Features
- Typing Indicator in list
- Scroll to Top FAB, Pull to Refresh, Fast Scroll
- Recent Searches, Search Filters
- Auto-Reply per chat
- Message Scheduler from list
- Import from WhatsApp, Import from MODs
- Export to HTML, Export with Media

### Voice Features
- Voice Search, Voice Commands
- Voice Read Messages, Voice Reply

### Call Features
- Speed Dial, Call Notes, Call Reminder

### Contacts
- Sort, Filter
- QR Code for Group invite
- QR Code for Linked Devices

### Custom UI
- Pin/Mute Icon Position/Color
- Status add button variants

### Accessibility
- Alt Text, Auto-Alt Text, Audio Description
- Reduce Motion, High Contrast
- Color Blind Mode, Switch Access, Braille Support

### Monetization
- Ads, Sponsored Content, Affiliate Links
- Tips/Diamond, Subscription, Exclusive Content

### Analytics
- Views Graph, Views by time/day/location/device
- Completion Rate, Drop-off Point
- Engagement/Share/Save Rate
- Audience Demographics/Retention, Growth Rate

### Cross-Platform Sharing
- Instagram, Facebook, Twitter/X, Snapchat, TikTok, YouTube Shorts

### Business/Shopping
- Shopping Tag, Product Catalog
- Fundraiser, Event, Reminder sticker
- Challenge, Collaboration invite

### Debug/Developer Features
- Debug Mode, Log Viewer, Network Logger
- Database Viewer, Shared Preferences Viewer
- Force Crash, Clear All Data

## Prerequisites

- Node.js >= 18
- Java Development Kit (JDK) 11 or higher
- Android Studio with Android SDK
- React Native CLI

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Android dependencies:
```bash
cd android
./gradlew build
```

## Running the App

### On Android Device/Emulator

1. Start Metro bundler:
```bash
npm start
```

2. Run on Android:
```bash
npm run android
```

## Building APK

### Debug APK
```bash
cd android
./gradlew assembleDebug
```
The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK
```bash
cd android
./gradlew assembleRelease
```
The APK will be located at: `android/app/build/outputs/apk/release/app-release.apk`

## Project Structure

```
react-native/
├── android/                 # Android native code
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/genzwhatsapp/
│   ├── build.gradle
│   └── settings.gradle
├── src/
│   ├── screens/             # React Native screens
│   │   ├── ChatListScreen.js
│   │   ├── StatusScreen.js
│   │   ├── CallsScreen.js
│   │   ├── ExploreScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── ChatDetailScreen.js
│   │   └── StatusDetailScreen.js
│   └── store/               # Redux store
│       └── index.js
├── App.js                   # Main app component
├── index.js                 # Entry point
├── package.json
└── app.json
```

## Key Dependencies

- **Navigation**: @react-navigation/native, @react-navigation/stack, @react-navigation/bottom-tabs
- **State Management**: Redux Toolkit
- **Icons**: react-native-vector-icons
- **Camera**: react-native-camera, react-native-image-picker
- **Video**: react-native-video
- **Audio**: react-native-audio-recorder-player, react-native-sound, react-native-tts
- **Voice**: react-native-voice
- **Biometrics**: react-native-biometrics
- **Storage**: @react-native-async-storage/async-storage, react-native-fs
- **Sharing**: react-native-share
- **QR Code**: react-native-qrcode-scanner, react-native-qrcode-svg
- **Maps**: react-native-maps
- **Charts**: react-native-chart-kit, react-native-svg-charts
- **Firebase**: @react-native-firebase/* (Auth, Firestore, Storage, Messaging, Analytics)

## Configuration

### Android Permissions

The following permissions are included in AndroidManifest.xml:
- INTERNET
- CAMERA
- RECORD_AUDIO
- READ/WRITE_EXTERNAL_STORAGE
- ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
- READ/WRITE_CONTACTS
- CALL_PHONE, READ_PHONE_STATE
- USE_FINGERPRINT
- VIBRATE
- WAKE_LOCK

### App Configuration

- **Package Name**: com.genzwhatsapp
- **Application ID**: com.genzwhatsapp
- **Min SDK**: 21 (Android 5.0)
- **Target SDK**: 33 (Android 13)

## Development

### Adding New Screens

1. Create screen file in `src/screens/`
2. Add to navigation stack in `App.js`
3. Implement screen logic with Redux integration

### Adding New Features

1. Create Redux slice in `src/store/index.js`
2. Add actions and reducers
3. Integrate with screens using useSelector/useDispatch

## Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Clear Cache
```bash
npm start -- --reset-cache
cd android && ./gradlew clean && cd ..
rm -rf node_modules && npm install
```

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.
