const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequest,
  payRequest,
  cancelRequest,
  getPaymentBalance
} = require('../controllers/paymentController');

router.use(protect);

router.get('/requests', getPaymentRequests);
router.post('/request', createPaymentRequest);
router.get('/balance', getPaymentBalance);
router.get('/requests/:id', getPaymentRequest);
router.post('/requests/:id/pay', payRequest);
router.post('/requests/:id/cancel', cancelRequest);

module.exports = router;
