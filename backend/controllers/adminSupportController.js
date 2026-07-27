const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

const notifyUserSocket = (req, userId, event, payload) => {
  const io = req.app.get('io');
  if (io) io.to(String(userId)).emit(event, payload);
};

// ===========================================================================
// SUPPORT TICKET SYSTEM
// ===========================================================================
exports.listTickets = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    else filter.category = { $ne: 'direct_message' }; // direct chats live under Admin<->User Chat

    const [total, tickets] = await Promise.all([
      SupportTicket.countDocuments(filter),
      SupportTicket.find(filter)
        .populate('userId', 'username phoneNumber')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    res.json({ success: true, tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    console.error('[AdminSupport] listTickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('userId', 'username phoneNumber').lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.conversation.push({ sender: 'admin', senderId: 'owner', message: message.trim(), readByAdmin: true });
    if (ticket.status === 'open') ticket.status = 'pending';
    await ticket.save();

    notifyUserSocket(req, ticket.userId, 'ticket:message', { ticketId: ticket._id, message: message.trim(), from: 'admin' });
    await logAdminAction(req.admin.id, 'admin_replied_ticket', { ticketId: ticket._id }, ticket.userId, null, req);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reply' });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['open', 'pending', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await logAdminAction(req.admin.id, 'admin_updated_ticket_status', { ticketId: ticket._id, status }, ticket.userId, null, req);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};

// ===========================================================================
// ADMIN <-> USER CHAT (direct 1:1 conversations opened by the admin,
// separate from user-submitted support tickets — same underlying model)
// ===========================================================================
exports.listDirectChats = async (req, res) => {
  try {
    const chats = await SupportTicket.find({ category: 'direct_message' })
      .populate('userId', 'username phoneNumber')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load chats' });
  }
};

exports.startDirectChat = async (req, res) => {
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'userId and message are required' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let chat = await SupportTicket.findOne({ userId, category: 'direct_message' });
    if (!chat) {
      chat = new SupportTicket({
        userId, subject: 'Direct message from admin', category: 'direct_message',
        openedBy: 'admin', status: 'open'
      });
    }
    chat.conversation.push({ sender: 'admin', senderId: 'owner', message: message.trim(), readByAdmin: true });
    chat.status = 'open';
    await chat.save();

    notifyUserSocket(req, userId, 'ticket:message', { ticketId: chat._id, message: message.trim(), from: 'admin' });
    await logAdminAction(req.admin.id, 'admin_started_direct_chat', { userId }, userId, null, req);
    res.json({ success: true, chat });
  } catch (error) {
    console.error('[AdminSupport] startDirectChat error:', error);
    res.status(500).json({ success: false, message: 'Failed to start chat' });
  }
};
