const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  deleteFile,
  getFileManagerSettings,
  getFileStats,
  getFilesByType,
  getUserFiles,
  resetFileManagerSettings,
  shareFile,
  toggleFileManager,
  updateFileManagerSettings,
} = require('../controllers/fileManagerController');

router.use(protect);

router.get('/settings', getFileManagerSettings);
router.post('/settings', updateFileManagerSettings);
router.get('/files', getUserFiles);
router.get('/files/:type', getFilesByType);
router.get('/stats', getFileStats);
router.delete('/file/:id', deleteFile);
router.post('/share/:id', shareFile);
router.post('/toggle', toggleFileManager);
router.post('/reset', resetFileManagerSettings);

module.exports = router;
