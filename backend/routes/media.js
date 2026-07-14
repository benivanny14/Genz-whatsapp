const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/auth");
const {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  uploadMultipleImages,
  uploadMultipleVideos,
  uploadMultipleDocuments,
  uploadAny,
  handleUploadError,
} = require("../middleware/upload");
const { validateFileContent } = require("../middleware/fileValidation");
const mediaController = require("../controllers/mediaController");

/**
 * Media Routes
 * All routes are protected and require authentication
 * validateFileContent checks magic bytes to prevent malware disguised as media
 */

// Upload routes with specific media type middleware
router.post(
  "/upload/image",
  protect,
  uploadImage,
  handleUploadError,
  validateFileContent,
  mediaController.uploadFile,
);
router.post(
  "/upload/video",
  protect,
  uploadVideo,
  handleUploadError,
  validateFileContent,
  mediaController.uploadFile,
);
router.post(
  "/upload/audio",
  protect,
  uploadAudio,
  handleUploadError,
  validateFileContent,
  mediaController.uploadFile,
);
router.post(
  "/upload/document",
  protect,
  uploadDocument,
  handleUploadError,
  validateFileContent,
  mediaController.uploadFile,
);

// Generic upload route (accepts any supported type)
router.post(
  "/upload",
  protect,
  uploadAny,
  handleUploadError,
  validateFileContent,
  mediaController.uploadFile,
);

// Multiple file upload routes
router.post(
  "/upload/images",
  protect,
  uploadMultipleImages,
  handleUploadError,
  validateFileContent,
  mediaController.uploadMultipleFiles,
);
router.post(
  "/upload/videos",
  protect,
  uploadMultipleVideos,
  handleUploadError,
  validateFileContent,
  mediaController.uploadMultipleFiles,
);
router.post(
  "/upload/documents",
  protect,
  uploadMultipleDocuments,
  handleUploadError,
  validateFileContent,
  mediaController.uploadMultipleFiles,
);

// Generic multiple upload route
router.post(
  "/upload-multiple",
  protect,
  uploadAny,
  handleUploadError,
  validateFileContent,
  mediaController.uploadMultipleFiles,
);

// Admin cleanup route and batch routes must be registered before /:publicId.
router.get("/sign-local", protect, mediaController.signLocalMedia);
router.delete(
  "/cleanup",
  require('../middleware/superAdminAuth').superAdminAuth,
  mediaController.cleanupOrphanedFiles,
);
router.delete("/batch", protect, mediaController.deleteFiles);

// File management routes
router.delete("/:publicId", protect, mediaController.deleteFile);
router.get("/:publicId/info", protect, mediaController.getFileInfo);
router.get("/:publicId/signed-url", protect, mediaController.generateSignedUrl);
router.get("/:publicId/transform", protect, mediaController.transformImage);
router.get("/:publicId/thumbnail", protect, mediaController.getVideoThumbnail);

module.exports = router;
