const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  acceptCollaborativeStatus,
  createCollaborativeStatus,
  declineCollaborativeStatus,
  deleteCollaborativeStatus,
  getCollaborativeStatus,
  getCollaborativeStatusSettings,
  getCollaborativeStatuses,
  resetCollaborativeStatusSettings,
  toggleCollaborativeStatus,
  updateCollaborativeStatus,
  updateCollaborativeStatusSettings,
} = require('../controllers/collaborativeStatusController');

router.use(protect);

router.get('/settings', getCollaborativeStatusSettings);
router.post('/settings', updateCollaborativeStatusSettings);
router.post('/create', createCollaborativeStatus);
router.get('/', getCollaborativeStatuses);
router.post('/toggle', toggleCollaborativeStatus);
router.post('/reset', resetCollaborativeStatusSettings);
router.get('/:id', getCollaborativeStatus);
router.post('/:id/accept', acceptCollaborativeStatus);
router.post('/:id/decline', declineCollaborativeStatus);
router.post('/:id', updateCollaborativeStatus);
router.delete('/:id', deleteCollaborativeStatus);

module.exports = router;
