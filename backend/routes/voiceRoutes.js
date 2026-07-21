const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadVoiceNote,
  getVoiceNote,
  deleteVoiceNote,
  getAllVoiceNotes,
  updateVoiceNote
} = require('../controllers/voiceController');
const { protect } = require('../middleware/auth');
// FIX: this was the only upload route in the app that never ran
// validateFileContent (magic-byte / real-content verification). Its own
// fileFilter only checks the client-supplied `mimetype` header, which is
// trivially spoofable — an attacker could upload an .exe renamed with
// Content-Type: audio/mpeg and it would be stored and served to other
// users in the chat. Every other upload path (media.js, status uploads)
// already runs this check.
const { validateFileContent } = require('../middleware/fileValidation');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype === 'audio/webm' ? '.webm' : '.mp3';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: function (req, file, cb) {
    // Accept audio files only
    const allowedMimes = [
      'audio/webm',
      'audio/ogg',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

router.use(protect);

// Routes
router.post('/upload', upload.single('file'), validateFileContent, uploadVoiceNote);
router.get('/', getAllVoiceNotes);
router.get('/:id', getVoiceNote);
router.put('/:id', updateVoiceNote);
router.delete('/:id', deleteVoiceNote);

module.exports = router;
