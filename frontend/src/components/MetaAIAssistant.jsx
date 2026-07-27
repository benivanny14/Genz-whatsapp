import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, Copy, ThumbsUp, ThumbsDown, RefreshCw, User, Brain, Lightbulb, Zap, MessageSquare, Image as ImageIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MetaAIAssistant = ({ onClose, chatContext, currentUser }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hi! I\'m Meta AI, your intelligent assistant. I can help you with:\n\n• Summarizing conversations\n• Generating responses\n• Translating messages\n• Answering questions\n• Creative writing\n\nHow can I assist you today?',
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState(null);
  const messagesEndRef = useRef(null);

  const capabilities = [
    { id: 'summarize', name: 'Summarize Chat', icon: <FileText size={20} />, description: 'Get a summary of this conversation' },
    { id: 'respond', name: 'Suggest Response', icon: <MessageSquare size={20} />, description: 'Get AI-generated response suggestions' },
    { id: 'translate', name: 'Translate', icon: <Zap size={20} />, description: 'Translate messages to another language' },
    { id: 'creative', name: 'Creative Writing', icon: <Sparkles size={20} />, description: 'Generate creative content' },
    { id: 'analyze', name: 'Analyze Sentiment', icon: <Brain size={20} />, description: 'Analyze the tone of messages' },
    { id: 'extract', name: 'Extract Info', icon: <Lightbulb size={20} />, description: 'Extract key information' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: generateAIResponse(inputMessage, selectedCapability),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      setSelectedCapability(null);
    }, 1500);
  };

  const generateAIResponse = (input, capability) => {
    if (capability === 'summarize') {
      return 'Based on this conversation, the main topics discussed are:\n\n1. Project planning and timeline\n2. Technical requirements\n3. Team coordination\n4. Budget considerations\n\nThe overall sentiment is positive with productive collaboration between team members.';
    }
    if (capability === 'respond') {
      return 'Here are some response suggestions:\n\n• "That sounds great! Let\'s move forward with this approach."\n• "I have a few questions about the implementation details."\n• "Can we schedule a follow-up meeting to discuss this further?"';
    }
    if (capability === 'translate') {
      return 'I can help translate messages. Please specify which language you\'d like to translate to (e.g., Spanish, French, German, etc.).';
    }
    if (capability === 'creative') {
      return 'Here\'s a creative message you could use:\n\n"🌟 Exciting news! We\'re launching something amazing soon. Stay tuned for updates that will transform the way you work!"';
    }
    if (capability === 'analyze') {
      return 'Sentiment Analysis:\n\n• Overall Tone: Positive and collaborative\n• Key Emotions: Enthusiasm, confidence, optimism\n• Communication Style: Professional yet friendly\n• Engagement Level: High';
    }
    if (capability === 'extract') {
      return 'Key Information Extracted:\n\n• Action Items: 3 tasks assigned\n• Deadlines: 2 dates mentioned\n• Decisions Made: Project approved\n• Next Steps: Schedule planning meeting';
    }

    // Default response
    return `I understand you're asking about "${input}". Let me help you with that.\n\nBased on the context, I can provide insights and suggestions. Would you like me to elaborate on any specific aspect?`;
  };

  const handleCapabilitySelect = (capability) => {
    setSelectedCapability(capability);
    const capabilityMessage = {
      id: Date.now(),
      role: 'user',
      content: `I'd like to ${capability.name.toLowerCase()}`,
      timestamp: Date.now()
    };
    setMessages([...messages, capabilityMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: generateAIResponse('', capability),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleFeedback = (messageId, isPositive) => {
    // Handle feedback
    console.log(`Feedback: ${isPositive ? 'positive' : 'negative'} for message ${messageId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00a884] to-[#00d4ff] rounded-full flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                Meta AI
                <Sparkles size={18} className="text-[#00a884]" />
              </h2>
              <p className="text-gray-400 text-sm">Your intelligent assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Capabilities */}
        <div className="p-4 border-b border-[#00a884]/20">
          <p className="text-gray-400 text-sm mb-3">Quick Actions</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {capabilities.map(capability => (
              <button
                key={capability.id}
                onClick={() => handleCapabilitySelect(capability)}
                className="flex-shrink-0 bg-[#0b141a] hover:bg-[#00a884]/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-[#00a884]/30"
              >
                {capability.icon}
                {capability.name}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-[#00a884]' : 'bg-gradient-to-br from-[#00a884] to-[#00d4ff]'
                }`}>
                  {message.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
                </div>
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                  <div className={`flex items-center gap-2 mt-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    <span className="text-gray-500 text-xs">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, true)}
                          className="text-gray-400 hover:text-green-400 transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, false)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setMessages([...messages, {
                              id: Date.now(),
                              role: 'user',
                              content: 'Can you regenerate this response?',
                              timestamp: Date.now()
                            }]);
                            setIsTyping(true);
                            setTimeout(() => {
                              setMessages(prev => [...prev, {
                                id: Date.now() + 1,
                                role: 'assistant',
                                content: generateAIResponse('', selectedCapability),
                                timestamp: Date.now()
                              }]);
                              setIsTyping(false);
                            }, 1500);
                          }}
                          className="text-gray-400 hover:text-[#00a884] transition-colors"
                          title="Regenerate"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a884] to-[#00d4ff] flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-[#0b141a] p-4 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#00a884]/20">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Meta AI anything..."
              className="flex-1 bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-[#00a884] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={20} />
              Send
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center">
            Meta AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// AI Settings Component
export const AISettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Bot size={18} className="text-[#00a884]" />
            Meta AI Assistant
          </p>
          <p className="text-gray-400 text-sm">Enable AI-powered features</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, aiEnabled: !settings.aiEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.aiEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.aiEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.aiEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-suggest responses</p>
              <p className="text-gray-400 text-xs">Show AI response suggestions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSuggest: !settings.autoSuggest })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSuggest ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSuggest ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Smart summaries</p>
              <p className="text-gray-400 text-xs">Generate chat summaries</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, smartSummaries: !settings.smartSummaries })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.smartSummaries ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.smartSummaries ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Message translation</p>
              <p className="text-gray-400 text-xs">Auto-translate foreign messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoTranslate: !settings.autoTranslate })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoTranslate ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoTranslate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default language for translation</p>
            <select
              value={settings.defaultLanguage || 'en'}
              onChange={(e) => onUpdate({ ...settings, defaultLanguage: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="sw">Swahili</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaAIAssistant;
