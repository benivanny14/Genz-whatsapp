const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearEditHistory,
  editAudio,
  editImage,
  editVideo,
  getEditHistory,
  getMediaEditorSettings,
  resetMediaEditorSettings,
  toggleMediaEditor,
  updateMediaEditorSettings,
} = require('../controllers/mediaEditorController');

router.use(protect);

router.get('/settings', getMediaEditorSettings);
router.post('/settings', updateMediaEditorSettings);
router.post('/image', editImage);
router.post('/video', editVideo);
router.post('/audio', editAudio);
router.get('/history', getEditHistory);
router.delete('/history', clearEditHistory);
router.post('/toggle', toggleMediaEditor);
router.post('/reset', resetMediaEditorSettings);

module.exports = router;
