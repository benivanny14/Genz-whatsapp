const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1';

const aiService = {
  // Chat completion for AI-powered chat
  chatCompletion: async (messages, model = 'gpt-3.5-turbo', temperature = 0.7) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get AI response');
      }

      const data = await response.json();
      return {
        success: true,
        response: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error('Error in chat completion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Generate smart reply suggestions
  generateReplySuggestions: async (conversationContext, numSuggestions = 3) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that suggests natural, conversational replies for a messaging app. Generate 3 different reply options that are contextually appropriate.'
        },
        {
          role: 'user',
          content: `Here's the conversation context:\n${conversationContext}\n\nGenerate ${numSuggestions} different reply suggestions. Format as a JSON array of strings.`
        }
      ];

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.8,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate suggestions');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Try to parse as JSON array
      try {
        const suggestions = JSON.parse(content);
        return {
          success: true,
          suggestions: Array.isArray(suggestions) ? suggestions : [content]
        };
      } catch {
        // If not JSON, split by newlines
        const suggestions = content.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '').trim());
        return {
          success: true,
          suggestions: suggestions.length > 0 ? suggestions : [content]
        };
      }
    } catch (error) {
      console.error('Error generating reply suggestions:', error);
      return {
        success: false,
        suggestions: [],
        error: error.message
      };
    }
  },

  // Summarize conversation
  summarizeConversation: async (messages, maxLength = 100) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const messagesText = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
      
      const promptMessages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes conversations concisely.'
        },
        {
          role: 'user',
          content: `Summarize this conversation in ${maxLength} characters or less:\n${messagesText}`
        }
      ];

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: promptMessages,
          temperature: 0.5,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to summarize conversation');
      }

      const data = await response.json();
      return {
        success: true,
        summary: data.choices[0].message.content
      };
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      return {
        success: false,
        summary: '',
        error: error.message
      };
    }
  },

  // Content moderation
  moderateContent: async (content) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(`${OPENAI_API_URL}/moderations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          input: content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to moderate content');
      }

      const data = await response.json();
      const results = data.results[0];
      
      return {
        success: true,
        flagged: results.flagged,
        categories: results.categories,
        scores: results.category_scores
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        success: false,
        flagged: false,
        error: error.message
      };
    }
  },

  // Generate auto-reply
  generateAutoReply: async (message, userContext = '') => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates appropriate auto-replies for a messaging app. Keep replies concise and natural.'
        },
        {
          role: 'user',
          content: `Generate an auto-reply for this message: "${message}"${userContext ? `\nUser context: ${userContext}` : ''}`
        }
      ];

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate auto-reply');
      }

      const data = await response.json();
      return {
        success: true,
        reply: data.choices[0].message.content.trim()
      };
    } catch (error) {
      console.error('Error generating auto-reply:', error);
      return {
        success: false,
        reply: '',
        error: error.message
      };
    }
  },

  // Translate message
  translateMessage: async (text, targetLanguage) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful translator. Translate the given text to the target language accurately.'
        },
        {
          role: 'user',
          content: `Translate this text to ${targetLanguage}: "${text}"`
        }
      ];

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to translate message');
      }

      const data = await response.json();
      return {
        success: true,
        translation: data.choices[0].message.content.trim()
      };
    } catch (error) {
      console.error('Error translating message:', error);
      return {
        success: false,
        translation: '',
        error: error.message
      };
    }
  }
};

export default aiService;
