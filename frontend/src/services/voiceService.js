import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

// Upload voice note to backend
export const uploadVoiceNote = async (audioBlob, metadata = {}) => {
  try {
    if (!audioBlob) {
      throw new Error('No audio blob provided');
    }

    if (audioBlob.size === 0) {
      throw new Error('Audio blob is empty');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
    
    // Add metadata
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await authFetch(`${API_URL}/api/voice/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Upload failed');
    }
    
    return data;
  } catch (error) {
    console.error('Voice note upload error:', error);
    throw error;
  }
};

// Get voice note by ID
export const getVoiceNote = async (voiceNoteId) => {
  try {
    if (!voiceNoteId) {
      throw new Error('Voice note ID is required');
    }

    const response = await authFetch(`${API_URL}/api/voice/${voiceNoteId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch voice note: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch voice note');
    }
    
    return data;
  } catch (error) {
    console.error('Get voice note error:', error);
    throw error;
  }
};

// Delete voice note
export const deleteVoiceNote = async (voiceNoteId) => {
  try {
    if (!voiceNoteId) {
      throw new Error('Voice note ID is required');
    }

    const response = await authFetch(`${API_URL}/api/voice/${voiceNoteId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete voice note: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete voice note');
    }
    
    return data;
  } catch (error) {
    console.error('Delete voice note error:', error);
    throw error;
  }
};

// Analyze audio for waveform data
export const analyzeAudioForWaveform = async (audioBlob) => {
  try {
    if (!audioBlob) {
      throw new Error('Audio blob is required');
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    // Sample data for waveform (reduce to 100 points)
    const samples = 100;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Uint8Array(samples);
    
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      waveform[i] = Math.min(255, (sum / blockSize) * 255);
    }
    
    await audioCtx.close();
    return Array.from(waveform);
  } catch (error) {
    console.error('Waveform analysis error:', error);
    return null;
  }
};

// Get audio duration
export const getAudioDuration = async (audioBlob) => {
  try {
    if (!audioBlob) {
      throw new Error('Audio blob is required');
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(audioBlob);
    });
  } catch (error) {
    console.error('Get audio duration error:', error);
    return 0;
  }
};

// Convert blob to base64 for offline storage
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert base64 to blob
export const base64ToBlob = (base64, mimeType = 'audio/webm') => {
  try {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('Base64 to blob error:', error);
    return null;
  }
};

// Save voice note to IndexedDB for offline access
export const saveVoiceNoteToIndexedDB = async (voiceNoteId, audioBlob, metadata) => {
  try {
    const dbRequest = indexedDB.open('GENZVoiceNotes', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        if (!db.objectStoreNames.contains('voiceNotes')) {
          db.createObjectStore('voiceNotes', { keyPath: 'id' });
        }
        
        const transaction = db.transaction(['voiceNotes'], 'readwrite');
        const store = transaction.objectStore('voiceNotes');
        
        const base64Audio = await blobToBase64(audioBlob);
        
        const voiceNote = {
          id: voiceNoteId,
          audioData: base64Audio,
          metadata,
          createdAt: Date.now()
        };
        
        store.put(voiceNote);
        
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB save error:', error);
    return false;
  }
};

// Get voice note from IndexedDB
export const getVoiceNoteFromIndexedDB = async (voiceNoteId) => {
  try {
    const dbRequest = indexedDB.open('GENZVoiceNotes', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['voiceNotes'], 'readonly');
        const store = transaction.objectStore('voiceNotes');
        const request = store.get(voiceNoteId);
        
        request.onsuccess = () => {
          const voiceNote = request.result;
          if (voiceNote) {
            const blob = base64ToBlob(voiceNote.audioData);
            resolve({
              blob,
              metadata: voiceNote.metadata
            });
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB get error:', error);
    return null;
  }
};

// Delete voice note from IndexedDB
export const deleteVoiceNoteFromIndexedDB = async (voiceNoteId) => {
  try {
    const dbRequest = indexedDB.open('GENZVoiceNotes', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['voiceNotes'], 'readwrite');
        const store = transaction.objectStore('voiceNotes');
        const request = store.delete(voiceNoteId);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB delete error:', error);
    return false;
  }
};
