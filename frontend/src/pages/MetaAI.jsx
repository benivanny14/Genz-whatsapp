import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, ArrowLeft, User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const MetaAI = () => {
  const navigate = useNavigate();
  const { user } = useChat();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m Meta AI, your intelligent assistant. How can I help you today? I can help you with:\n\n• Writing messages and emails\n• Translating text\n• Answering questions\n• Creative writing\n• And much more!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Simulate AI response (in production, this would call an AI API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: generateAIResponse(userMessage.content)
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    // Simple rule-based responses (in production, use actual AI API)
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return 'Hello! How can I assist you today?';
    } else if (lowerInput.includes('translate')) {
      return 'I can help you translate text. Please provide the text you want to translate and the target language.';
    } else if (lowerInput.includes('write') || lowerInput.includes('message')) {
      return 'I can help you write messages. What would you like to say?';
    } else if (lowerInput.includes('help')) {
      return 'I can help you with:\n• Writing messages and emails\n• Translating text\n• Answering questions\n• Creative writing\n• Summarizing content\n• And much more!';
    } else if (lowerInput.includes('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    } else {
      return 'I understand you\'re asking about: "' + userInput + '". Let me help you with that. Could you provide more details so I can give you a better response?';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="h-screen bg-[#111b21] flex flex-col">
      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[#2a3942] rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#aebac1]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Meta AI</h1>
              <p className="text-xs text-[#00a884]">Online</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([{
            id: Date.now(),
            role: 'assistant',
            content: 'Hello! I\'m Meta AI, your intelligent assistant. How can I help you today?'
          }])}
          className="p-2 hover:bg-[#2a3942] rounded-lg transition-colors"
          title="New Chat"
          aria-label="New Chat"
        >
          <RefreshCw className="w-5 h-5 text-[#aebac1]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-[#00a884]' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`relative group ${
                message.role === 'user'
                  ? 'bg-[#005c4b] text-white rounded-2xl rounded-tr-none px-4 py-2'
                  : 'bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-none px-4 py-2'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                {message.role === 'assistant' && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="p-1 hover:bg-[#2a3942] rounded transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-[#8696a0]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#202c33] px-4 py-3 border-t border-[#2a3942]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message Meta AI..."
            rows={1}
            className="flex-1 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-3 focus:outline-none focus:border-[#00a884] resize-none max-h-32"
            style={{ minHeight: '48px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#029b7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[#8696a0] mt-2 text-center">
          Meta AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};

export default MetaAI;
