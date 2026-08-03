const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCallLogs,
  createCallLog,
  deleteCallLog,
  clearCallLogs,
  generateCallLink,
  getCallLink,
  getCallLinks,
  deleteCallLink
} = require('../controllers/callController');

router.use(protect);

router.get('/', getCallLogs);
router.post('/', createCallLog);
router.delete('/clear', clearCallLogs);
router.delete('/:id', deleteCallLog);

// Call link routes
router.post('/link', generateCallLink);
router.get('/links', getCallLinks);
router.get('/link/:token', getCallLink);
router.delete('/link/:token', deleteCallLink);

module.exports = router;
