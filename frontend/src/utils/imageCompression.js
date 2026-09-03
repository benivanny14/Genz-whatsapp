/**
 * Image compression utility for Genz Messenger
 * Supports both dataURL output (for previews) and Blob output (for uploads).
 */

/**
 * Compress an image file to a data URL.
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width in pixels (default: 1080)
 * @param {number} quality - JPEG quality 0-1 (default: 0.6)
 * @returns {Promise<string>} Base64 data URL
 */
export const compressImage = (file, maxWidth = 1080, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compress an image file to a Blob (for uploads).
 * Supports both maxWidth and maxHeight constraints.
 * @param {File} file - Image file to compress
 * @param {object} opts
 * @param {number} opts.maxWidth - Maximum width in pixels (default: 1080)
 * @param {number} opts.maxHeight - Maximum height in pixels (default: 1920)
 * @param {number} opts.quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<Blob>} Compressed image Blob
 */
export const compressImageToBlob = (file, { maxWidth = 1080, maxHeight = 1920, quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Scale down to fit within maxWidth × maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
