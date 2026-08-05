const aiService = require('../services/aiService');

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SYSTEM_LENGTH = 2000;

// @desc    AI chat completion
// @route   POST /api/ai/chat
// @access  Private
exports.chatCompletion = async (req, res) => {
  try {
    const { messages, system, maxTokens, temperature } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required' });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ success: false, message: `At most ${MAX_MESSAGES} messages allowed` });
    }

    const cleaned = [];
    for (const m of messages) {
      if (!m || typeof m !== 'object' || typeof m.content !== 'string') {
        return res.status(400).json({ success: false, message: 'Each message must have a string content field' });
      }
      const content = m.content.trim();
      if (!content) {
        return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
      }
      if (content.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ success: false, message: `Message content exceeds ${MAX_MESSAGE_LENGTH} characters` });
      }
      cleaned.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content
      });
    }

    const systemText = typeof system === 'string' ? system.trim().slice(0, MAX_SYSTEM_LENGTH) : '';

    const result = await aiService.completeChat({
      system: systemText || undefined,
      messages: cleaned,
      maxTokens,
      temperature
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('AI chat completion failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'AI chat completion failed' });
  }
};
