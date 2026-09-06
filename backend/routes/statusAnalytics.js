const express = require('express');
const router = express.Router();
const {
  getStatusAnalytics,
  getAnalyticsSummary,
  updateAnalytics,
  deleteAnalytics
} = require('../controllers/statusAnalyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getAnalyticsSummary);
router.get('/:statusId', getStatusAnalytics);
router.post('/:statusId/update', updateAnalytics);
router.delete('/:statusId', deleteAnalytics);

module.exports = router;
