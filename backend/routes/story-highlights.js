const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addStatusToHighlight,
  createStoryHighlight,
  deleteStoryHighlight,
  getStoryHighlight,
  getStoryHighlights,
  getStoryHighlightsSettings,
  removeStatusFromHighlight,
  resetStoryHighlightsSettings,
  toggleStoryHighlights,
  updateStoryHighlight,
  updateStoryHighlightsSettings,
} = require('../controllers/statusToolsController');

router.use(protect);

router.get('/settings', getStoryHighlightsSettings);
router.post('/settings', updateStoryHighlightsSettings);
router.post('/create', createStoryHighlight);
router.get('/', getStoryHighlights);
router.post('/toggle', toggleStoryHighlights);
router.post('/reset', resetStoryHighlightsSettings);
router.get('/:id', getStoryHighlight);
router.post('/:id', updateStoryHighlight);
router.delete('/:id', deleteStoryHighlight);
router.post('/:highlightId/status', addStatusToHighlight);
router.delete('/:highlightId/status/:statusId', removeStatusFromHighlight);

module.exports = router;
