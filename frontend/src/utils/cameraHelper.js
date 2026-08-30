/**
 * cameraHelper.js — Native camera/gallery picker for Capacitor APK.
 *
 * Falls back to HTML file input when running in a browser.
 * All functions return null when the user cancels.
 */
import { Capacitor } from '@capacitor/core';

/**
 * Pick image from camera or gallery.
 * @param {Object} opts
 * @param {'camera'|'gallery'|'prompt'} [opts.source='prompt']
 * @param {number} [opts.quality=80] JPEG quality 0-100
 * @returns {Promise<{uri:string, type:string, name:string, blob:Blob, width?:number, height?:number}|null>}
 */
export const pickImage = async (opts = {}) => {
  const { source = 'prompt', quality = 80 } = opts;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source:
          source === 'camera' ? CameraSource.Camera :
          source === 'gallery' ? CameraSource.Photos :
          CameraSource.Prompt,
        saveToGallery: false,
        correctOrientation: true,
      });

      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      return {
        uri: photo.webPath,
        type: `image/${photo.format || 'jpeg'}`,
        name: `photo-${Date.now()}.${photo.format || 'jpg'}`,
        blob,
        width: photo.width,
        height: photo.height,
      };
    } catch (err) {
      if (err.message?.includes('cancel')) return null;
      throw err;
    }
  }

  // Web fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return resolve(null);
      resolve({
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        blob: file,
      });
    };
    input.click();
  });
};

/**
 * Pick video from gallery.
 * @param {Object} opts
 * @param {number} [opts.maxDuration=60]
 * @returns {Promise<{uri:string, type:string, name:string, blob:Blob, duration?:number}|null>}
 */
export const pickVideo = async (opts = {}) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { FilePicker } = await import('@capawesome/capacitor-file-picker');
      const result = await FilePicker.pickMedia({
        types: ['video/*'],
        readData: false,
      });

      if (!result.files?.length) return null;
      const file = result.files[0];
      const response = await fetch(file.path);
      const blob = await response.blob();

      return {
        uri: file.path,
        type: file.mimeType || 'video/mp4',
        name: file.name || `video-${Date.now()}.mp4`,
        blob,
        duration: file.duration,
      };
    } catch (err) {
      console.error('Video pick error:', err);
      return null;
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return resolve(null);
      resolve({
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        blob: file,
      });
    };
    input.click();
  });
};

/**
 * Share content using native share sheet or Web Share API.
 * @param {Object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.text]
 * @param {string} [opts.url]
 */
export const shareContent = async (opts) => {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
      dialogTitle: opts.dialogTitle || 'Shiriki',
    });
    return;
  }

  if (navigator.share) {
    await navigator.share(opts);
  } else {
    throw new Error('Web Share API not supported');
  }
};
