const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCallLogs,
  createCallLog,
  deleteCallLog,
  clearCallLogs
} = require('../controllers/callController');

router.use(protect);

router.get('/', getCallLogs);
router.post('/', createCallLog);
router.delete('/clear', clearCallLogs);
router.delete('/:id', deleteCallLog);

module.exports = router;
