const express = require('express');
const router = express.Router();
const {
  createHighlight,
  getHighlights,
  getHighlight,
  updateHighlight,
  deleteHighlight,
  archiveHighlight,
  unarchiveHighlight,
  addStatusToHighlight,
  removeStatusFromHighlight
} = require('../controllers/statusHighlightController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getHighlights)
  .post(createHighlight);

router.route('/:id')
  .get(getHighlight)
  .put(updateHighlight)
  .delete(deleteHighlight);

router.put('/:id/archive', archiveHighlight);
router.put('/:id/unarchive', unarchiveHighlight);

router.post('/:id/statuses', addStatusToHighlight);
router.delete('/:id/statuses/:statusId', removeStatusFromHighlight);

module.exports = router;
