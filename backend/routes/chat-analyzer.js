const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  analyzeConversation,
  exportAnalysisData,
  generateMonthlyReport,
  generateWeeklyReport,
  getChatAnalyzerSettings,
  getUserChatStats,
  resetChatAnalyzerSettings,
  updateChatAnalyzerSettings,
} = require('../controllers/chatAnalyzerController');

router.use(protect);

router.get('/settings', getChatAnalyzerSettings);
router.post('/settings', updateChatAnalyzerSettings);
router.post('/analyze', analyzeConversation);
router.get('/user-stats', getUserChatStats);
router.get('/weekly-report', generateWeeklyReport);
router.get('/monthly-report', generateMonthlyReport);
router.post('/export', exportAnalysisData);
router.post('/reset', resetChatAnalyzerSettings);

module.exports = router;
