import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Layout, Sparkles, Star, Clock, TrendingUp, Heart } from 'lucide-react';

const StatusTemplatesPanel = ({ onClose, status, onTemplateSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const mockTemplates = [
    { id: 1, name: 'Morning Greeting', category: 'daily', content: 'Good morning! ☀️ Have a great day!', icon: Sparkles, popular: true },
    { id: 2, name: 'Motivation', category: 'motivation', content: 'Believe in yourself! You can do this! 💪', icon: Star, popular: true },
    { id: 3, name: 'Quote of the Day', category: 'quotes', content: '"The only way to do great work is to love what you do."', icon: Sparkles, popular: true },
    { id: 4, name: 'Weekend Vibes', category: 'daily', content: 'Weekend mode activated! 🎉', icon: Heart, popular: false },
    { id: 5, name: 'Work Update', category: 'work', content: 'Working hard, achieving goals! 💼', icon: Clock, popular: false },
    { id: 6, name: 'Fitness Goal', category: 'fitness', content: 'Fitness journey continues! 💪🏃', icon: TrendingUp, popular: true },
    { id: 7, name: 'Food Moment', category: 'lifestyle', content: 'Foodie life! 🍕🍔', icon: Heart, popular: false },
    { id: 8, name: 'Travel Adventure', category: 'travel', content: 'Exploring new places! ✈️🌍', icon: Sparkles, popular: true },
    { id: 9, name: 'Music Vibe', category: 'entertainment', content: 'Music is life! 🎵🎧', icon: Heart, popular: false },
    { id: 10, name: 'Tech Update', category: 'tech', content: 'Tech enthusiast! 💻🚀', icon: Sparkles, popular: false },
    { id: 11, name: 'Celebration', category: 'events', content: 'Celebration time! 🎊🎈', icon: Star, popular: true },
    { id: 12, name: 'Relaxation', category: 'wellness', content: 'Taking it easy today! 😌🧘', icon: Heart, popular: false }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to mock templates
      setTemplates(mockTemplates);
    } finally {
      setLoading(false);
    }
  };

  const displayTemplates = templates.length > 0 ? templates : mockTemplates;

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'daily', label: 'Daily' },
    { id: 'motivation', label: 'Motivation' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'work', label: 'Work' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'travel', label: 'Travel' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'tech', label: 'Tech' },
    { id: 'events', label: 'Events' },
    { id: 'wellness', label: 'Wellness' }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? displayTemplates 
    : displayTemplates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Layout className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Templates</h2>
              <p className="text-white/60 text-xs">Choose a template to get started</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-2">
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors border border-transparent hover:border-[#00a884]/30"
                >
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{template.name}</p>
                      {template.popular && (
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <p className="text-white/60 text-sm truncate">{template.content}</p>
                  </div>
                  <Sparkles size={16} className="text-white/40" />
                </button>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <Layout size={48} className="mx-auto mb-2 opacity-50" />
              <p>No templates found in this category</p>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusTemplatesPanel;
