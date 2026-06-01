const mongoose = require('mongoose');

const voiceNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  waveform: {
    type: [Number],
    default: []
  },
  voiceEffect: {
    type: String,
    enum: ['none', 'child', 'robot', 'chipmunk', 'deep', 'echo', 'reverse'],
    default: 'none'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'audio/webm'
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
voiceNoteSchema.index({ userId: 1, createdAt: -1 });
voiceNoteSchema.index({ conversationId: 1 });

module.exports = mongoose.model('VoiceNote', voiceNoteSchema);
