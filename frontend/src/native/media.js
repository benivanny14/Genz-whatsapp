import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from 'capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { isNative } from './platform';

const dataUrlToFile = (dataUrl, name, type) => {
  const [meta, data] = dataUrl.split(',');
  const mime = type || (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
};

const blobToFile = async (blob, name, type) => new File([blob], name, { type: type || blob.type || 'application/octet-stream' });

export async function pickNativeMedia(kind = 'gallery') {
  if (!isNative()) return null;
  try {
    if (kind === 'camera' && Capacitor.isPluginAvailable('Camera')) {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false
      });
      return dataUrlToFile(photo.dataUrl, `capture-${Date.now()}.${photo.format || 'jpeg'}`, `image/${photo.format || 'jpeg'}`);
    }

    if ((kind === 'gallery' || kind === 'photo' || kind === 'video') && Capacitor.isPluginAvailable('Camera') && kind !== 'video') {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      return dataUrlToFile(photo.dataUrl, `media-${Date.now()}.${photo.format || 'jpeg'}`, `image/${photo.format || 'jpeg'}`);
    }

    const types = {
      gallery: ['image/*', 'video/*'],
      photo: ['image/*'],
      video: ['video/*'],
      audio: ['audio/*'],
      document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    const result = await FilePicker.pickFiles({
      types: types[kind] || types.document,
      readData: true,
      limit: 1
    });
    const file = result?.files?.[0];
    if (!file) return null;
    if (file.blob) return blobToFile(file.blob, file.name, file.mimeType);
    if (file.data) {
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      return new File([bytes], file.name || `file-${Date.now()}`, { type: file.mimeType || 'application/octet-stream' });
    }
    if (file.path && Capacitor.isPluginAvailable('Filesystem')) {
      const read = await Filesystem.readFile({ path: file.path, directory: Directory.Cache }).catch(() => null);
      if (read?.data) {
        const bytes = Uint8Array.from(atob(read.data), (c) => c.charCodeAt(0));
        return new File([bytes], file.name || `file-${Date.now()}`, { type: file.mimeType || 'application/octet-stream' });
      }
    }
  } catch (error) {
    if (error?.message && /cancel|denied|permission|don't ask again/i.test(error.message)) return null;
    console.warn('[native media] picker failed', error);
    throw error;
  }
  return null;
}
