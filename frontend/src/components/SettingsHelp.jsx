import React, { useState } from 'react';
import { HelpCircle, X, Search, MessageCircle, Book, AlertCircle, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsHelp = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const helpCategories = [
    { id: 'getting-started', name: 'Getting Started', icon: Book },
    { id: 'features', name: 'Features', icon: MessageCircle },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: AlertCircle },
    { id: 'contact', name: 'Contact Us', icon: Mail },
  ];

  const helpArticles = [
    {
      id: 1,
      category: 'getting-started',
      title: 'How to create an account',
      content: 'Learn how to sign up and set up your profile',
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Adding contacts',
      content: 'Find and add people to your contact list',
    },
    {
      id: 3,
      category: 'features',
      title: 'Sending messages',
      content: 'Send text, media, and voice messages',
    },
    {
      id: 4,
      category: 'features',
      title: 'Making calls',
      content: 'Voice and video calling features',
    },
    {
      id: 5,
      category: 'features',
      title: 'Status updates',
      content: 'Share moments with your contacts',
    },
    {
      id: 6,
      category: 'troubleshooting',
      title: 'Connection issues',
      content: 'Fix problems with internet connection',
    },
    {
      id: 7,
      category: 'troubleshooting',
      title: 'App not loading',
      content: 'Solutions for app performance issues',
    },
    {
      id: 8,
      category: 'contact',
      title: 'Support email',
      content: 'Get direct help from our support team',
    },
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Help Center</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            {helpCategories.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredArticles.map(article => (
              <button
                key={article.id}
                className="w-full p-4 rounded-lg bg-[#0b141a] border border-[#00a884]/20 hover:border-[#00a884] transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{article.title}</p>
                    <p className="text-gray-400 text-sm">{article.content}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-8">
              <HelpCircle className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No help articles found</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button className="w-full bg-[#00a884]/10 text-[#00a884] py-3 rounded-lg hover:bg-[#00a884]/20 transition-colors flex items-center justify-center gap-2">
            <Mail size={18} />
            Contact Support
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Help Button Component
export const HelpButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Help"
    >
      <HelpCircle size={18} />
    </button>
  );
};

export default SettingsHelp;
