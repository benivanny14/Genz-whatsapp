const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Compress and resize image for profile pictures
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save compressed image
 * @param {number} maxSize - Maximum size in KB (default: 100KB)
 * @returns {Promise<{success: boolean, outputPath: string, size: number, error?: string}>}
 */
async function compressImage(inputPath, outputPath, maxSize = 100) {
  try {
    console.log('🖼️ Compressing image:', inputPath);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error('Input file does not exist');
    }

    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSizeKB = originalStats.size / 1024;
    console.log(`📊 Original size: ${originalSizeKB.toFixed(2)} KB`);

    // If already small enough, just copy
    if (originalSizeKB <= maxSize) {
      console.log('✅ Image already small enough, no compression needed');
      if (inputPath !== outputPath) {
        fs.copyFileSync(inputPath, outputPath);
      }
      const stats = fs.statSync(outputPath);
      return {
        success: true,
        outputPath,
        size: stats.size
      };
    }

    // Compress and resize
    await sharp(inputPath)
      .resize(300, 300, { // Resize to 300x300 max
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ // Convert to JPEG for better compression
        quality: 80,
        progressive: true
      })
      .toFile(outputPath);

    // Get compressed file size
    const compressedStats = fs.statSync(outputPath);
    const compressedSizeKB = compressedStats.size / 1024;
    const compressionRatio = ((1 - compressedSizeKB / originalSizeKB) * 100).toFixed(2);

    console.log(`📉 Compressed size: ${compressedSizeKB.toFixed(2)} KB`);
    console.log(`📊 Compression ratio: ${compressionRatio}%`);

    return {
      success: true,
      outputPath,
      size: compressedStats.size
    };
  } catch (error) {
    console.error('❌ Image compression error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compress base64 image string
 * @param {string} base64String - Base64 image string
 * @param {number} maxSize - Maximum size in KB (default: 100KB)
 * @returns {Promise<{success: boolean, base64: string, size: number, error?: string}>}
 */
async function compressBase64Image(base64String, maxSize = 100) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('🖼️ Compressing base64 image...');
    console.log(`📊 Original size: ${(buffer.length / 1024).toFixed(2)} KB`);

    // If already small enough, return as is
    if (buffer.length / 1024 <= maxSize) {
      console.log('✅ Image already small enough, no compression needed');
      return {
        success: true,
        base64: base64String,
        size: buffer.length
      };
    }

    // Compress using sharp
    const compressedBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    const compressionRatio = ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(2);

    console.log(`📉 Compressed size: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`📊 Compression ratio: ${compressionRatio}%`);

    return {
      success: true,
      base64: compressedBase64,
      size: compressedBuffer.length
    };
  } catch (error) {
    console.error('❌ Base64 compression error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  compressImage,
  compressBase64Image
};
