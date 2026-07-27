const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

/**
 * @desc    Create a scheduled message
 * @route   POST /api/scheduled-messages
 * @access  Private
 */
exports.createScheduledMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType, mediaUrl, fileName, fileSize, sendAt } = req.body;
    const sender = getCurrentUserId(req);

    if (!conversationId || !content || !sendAt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, content, and sendAt are required'
      });
    }

    const sendDate = new Date(sendAt);
    if (sendDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'sendAt must be a future date'
      });
    }

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(p => p.userId?.toString() === sender);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation'
      });
    }

    const scheduledMessage = await ScheduledMessage.create({
      conversationId,
      sender,
      content,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      sendAt: sendDate,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Message scheduled successfully',
      scheduledMessage
    });
  } catch (error) {
    console.error('[ScheduledMessage] Create error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get all scheduled messages for a user
 * @route   GET /api/scheduled-messages
 * @access  Private
 */
exports.getScheduledMessages = async (req, res) => {
  try {
    const sender = getCurrentUserId(req);
    const { status, conversationId } = req.query;

    const query = { sender };
    if (status) query.status = status;
    if (conversationId) query.conversationId = conversationId;

    const scheduledMessages = await ScheduledMessage.find(query)
      .populate('conversationId', 'name type participants')
      .sort({ sendAt: 1 });

    res.status(200).json({
      success: true,
      scheduledMessages
    });
  } catch (error) {
    console.error('[ScheduledMessage] Get error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get a single scheduled message
 * @route   GET /api/scheduled-messages/:id
 * @access  Private
 */
exports.getScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const sender = getCurrentUserId(req);

    const scheduledMessage = await ScheduledMessage.findById(id)
      .populate('conversationId', 'name type participants');

    if (!scheduledMessage) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found'
      });
    }

    if (scheduledMessage.sender.toString() !== sender) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this scheduled message'
      });
    }

    res.status(200).json({
      success: true,
      scheduledMessage
    });
  } catch (error) {
    console.error('[ScheduledMessage] Get single error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Cancel a scheduled message
 * @route   DELETE /api/scheduled-messages/:id
 * @access  Private
 */
exports.cancelScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const sender = getCurrentUserId(req);

    const scheduledMessage = await ScheduledMessage.findById(id);

    if (!scheduledMessage) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found'
      });
    }

    if (scheduledMessage.sender.toString() !== sender) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this scheduled message'
      });
    }

    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending messages'
      });
    }

    scheduledMessage.status = 'cancelled';
    await scheduledMessage.save();

    res.status(200).json({
      success: true,
      message: 'Scheduled message cancelled successfully',
      scheduledMessage
    });
  } catch (error) {
    console.error('[ScheduledMessage] Cancel error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete a scheduled message
 * @route   DELETE /api/scheduled-messages/:id/permanent
 * @access  Private
 */
exports.deleteScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const sender = getCurrentUserId(req);

    const scheduledMessage = await ScheduledMessage.findById(id);

    if (!scheduledMessage) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found'
      });
    }

    if (scheduledMessage.sender.toString() !== sender) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this scheduled message'
      });
    }

    await ScheduledMessage.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Scheduled message deleted successfully'
    });
  } catch (error) {
    console.error('[ScheduledMessage] Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Process pending scheduled messages (called by cron job)
 * @route   POST /api/scheduled-messages/process
 * @access  Private (Admin only or internal)
 */
exports.processScheduledMessages = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all pending messages that should be sent
    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      sendAt: { $lte: now }
    }).populate('conversationId');

    let processedCount = 0;
    let failedCount = 0;

    for (const scheduledMsg of pendingMessages) {
      try {
        // Create the actual message
        const message = await Message.create({
          conversationId: scheduledMsg.conversationId._id,
          sender: scheduledMsg.sender,
          content: scheduledMsg.content,
          messageType: scheduledMsg.messageType,
          mediaUrl: scheduledMsg.mediaUrl,
          fileName: scheduledMsg.fileName,
          fileSize: scheduledMsg.fileSize
        });

        // Update scheduled message status
        scheduledMsg.status = 'sent';
        scheduledMsg.sentAt = now;
        await scheduledMsg.save();

        // Emit socket event for real-time delivery
        const io = req.app.get('io');
        if (io) {
          const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePicture')
            .populate('replyTo');
          io.to(scheduledMsg.conversationId._id.toString()).emit('message:received', populatedMessage);
        }

        processedCount++;
      } catch (error) {
        console.error('[ScheduledMessage] Failed to send message:', error);
        
        scheduledMsg.status = 'failed';
        scheduledMsg.errorMessage = error.message;
        scheduledMsg.retryCount = (scheduledMsg.retryCount || 0) + 1;
        
        if (scheduledMsg.retryCount < scheduledMsg.maxRetries) {
          scheduledMsg.status = 'pending'; // Retry later
        }
        
        await scheduledMsg.save();
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${processedCount} messages, ${failedCount} failed`,
      processedCount,
      failedCount
    });
  } catch (error) {
    console.error('[ScheduledMessage] Process error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
