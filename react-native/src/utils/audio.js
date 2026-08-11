import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';

let currentSound = null;

// react-native-sound needs a real file path (no content:// and no file://
// prefix on Android), so copy any content:// URI into the app cache first.
export const getPlayablePath = async (uri) => {
  if (!uri) return null;
  if (uri.startsWith('content://')) {
    const extMatch = uri.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : 'mp3';
    const dest = `${RNFS.CachesDirectoryPath}/status-music-${Date.now()}.${ext}`;
    await RNFS.copyFile(uri, dest);
    return dest;
  }
  return uri.replace(/^file:\/\//, '');
};

export const stopStatusAudio = () => {
  if (currentSound) {
    currentSound.stop(() => {
      currentSound.release();
      currentSound = null;
    });
  }
};

export const playStatusAudio = (uri, { onStart, onEnd, onError } = {}) => {
  stopStatusAudio();
  if (!uri) return null;
  Sound.setCategory('Playback');
  const sound = new Sound(uri, '', (error) => {
    if (error) {
      if (onError) onError(error);
      return;
    }
    currentSound = sound;
    if (onStart) onStart();
    sound.play((success) => {
      if (!success && onError) onError(new Error('Playback failed'));
      if (onEnd) onEnd();
      if (currentSound === sound) {
        currentSound = null;
        sound.release();
      }
    });
  });
  return sound;
};
