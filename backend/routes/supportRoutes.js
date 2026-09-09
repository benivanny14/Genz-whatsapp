const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createTicket, listMyTickets, getMyTicket, replyToMyTicket } = require('../controllers/supportController');

router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, listMyTickets);
router.get('/tickets/:id', protect, getMyTicket);
router.post('/tickets/:id/reply', protect, replyToMyTicket);

module.exports = router;
