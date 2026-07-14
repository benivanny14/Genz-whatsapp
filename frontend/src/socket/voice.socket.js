import { getSocket } from '../services/socket';

// Voice note socket events
export const emitVoiceStart = (conversationId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:start', { conversationId });
  }
};

export const emitVoiceUploading = (conversationId, progress) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:uploading', { conversationId, progress });
  }
};

export const emitVoiceSent = (conversationId, voiceNoteId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:sent', { conversationId, voiceNoteId });
  }
};

export const emitVoiceDelivered = (conversationId, voiceNoteId, recipientId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:delivered', { conversationId, voiceNoteId, recipientId });
  }
};

export const emitVoicePlayed = (conversationId, voiceNoteId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:played', { conversationId, voiceNoteId });
  }
};

export const emitVoiceDeleted = (conversationId, voiceNoteId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('voice:deleted', { conversationId, voiceNoteId });
  }
};

// Listen for voice note events
export const onVoiceStart = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:start', callback);
  }
};

export const onVoiceUploading = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:uploading', callback);
  }
};

export const onVoiceSent = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:sent', callback);
  }
};

export const onVoiceDelivered = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:delivered', callback);
  }
};

export const onVoicePlayed = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:played', callback);
  }
};

export const onVoiceDeleted = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('voice:deleted', callback);
  }
};

// Cleanup voice note event listeners
export const removeVoiceListeners = () => {
  const socket = getSocket();
  if (socket) {
    socket.off('voice:start');
    socket.off('voice:uploading');
    socket.off('voice:sent');
    socket.off('voice:delivered');
    socket.off('voice:played');
    socket.off('voice:deleted');
  }
};
