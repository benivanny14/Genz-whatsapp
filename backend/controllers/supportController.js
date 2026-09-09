const SupportTicket = require('../models/SupportTicket');

const notifyAdmins = (req, event, payload) => {
  const io = req.app.get('io');
  if (io) {
    io.to('role:admin').emit(event, payload);
    io.to('admin-room').emit(event, payload);
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, message, category } = req.body || {};
    if (!subject || !subject.trim()) return res.status(400).json({ success: false, message: 'Subject is required' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const ticket = new SupportTicket({
      userId: req.user._id,
      subject: subject.trim(),
      category: category || 'general',
      openedBy: 'user',
      status: 'open',
      conversation: [{ sender: 'user', senderId: String(req.user._id), message: message.trim(), readByUser: true }]
    });
    await ticket.save();

    // Notify admins live
    notifyAdmins(req, 'ticket:created', { ticketId: ticket._id, userId: String(req.user._id), subject: ticket.subject });

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('[Support] createTicket error:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

exports.listMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
};

exports.getMyTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
};

exports.replyToMyTicket = async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message is required' });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'Ticket is closed' });

    ticket.conversation.push({ sender: 'user', senderId: String(req.user._id), message: message.trim(), readByAdmin: false });
    if (ticket.status === 'resolved') ticket.status = 'open';
    await ticket.save();

    notifyAdmins(req, 'ticket:reply', { ticketId: ticket._id, userId: String(req.user._id), message: message.trim() });

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reply' });
  }
};
