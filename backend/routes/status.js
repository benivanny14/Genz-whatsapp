const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStatus, getStatuses, viewStatus,
  reactToStatus, deleteStatus, getViewers
} = require('../controllers/statusController');

router.post('/', protect, createStatus);
router.get('/', protect, getStatuses);
router.post('/:id/view', protect, viewStatus);
router.post('/:id/react', protect, reactToStatus);
router.delete('/:id', protect, deleteStatus);
router.get('/:id/viewers', protect, getViewers);
router.get('/:id/download', protect, require('../controllers/statusController').downloadStatus);

module.exports = router;
