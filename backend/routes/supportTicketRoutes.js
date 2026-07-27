const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');

const notifyAdmins = (req, event, payload) => {
  const io = req.app.get('io');
  if (io) io.to('role:admin').emit(event, payload);
};

// Create a new support ticket
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, message, category = 'general' } = req.body || {};
    if (!subject || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'subject and message are required' });
    }
    const ticket = await SupportTicket.create({
      userId: req.user._id,
      subject: subject.trim().slice(0, 150),
      category,
      openedBy: 'user',
      conversation: [{ sender: 'user', senderId: req.user._id.toString(), message: message.trim().slice(0, 4000), readByUser: true }]
    });
    notifyAdmins(req, 'ticket:new', { ticketId: ticket._id, subject: ticket.subject });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('[SupportTickets] create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
});

// List my own tickets (includes admin-opened direct-message threads)
router.get('/tickets', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
});

// Reply to my own ticket
router.post('/tickets/:id/reply', protect, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.conversation.push({ sender: 'user', senderId: req.user._id.toString(), message: message.trim().slice(0, 4000), readByUser: true });
    if (ticket.status === 'resolved' || ticket.status === 'closed') ticket.status = 'open';
    await ticket.save();

    notifyAdmins(req, 'ticket:message', { ticketId: ticket._id, from: 'user' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reply' });
  }
});

module.exports = router;
