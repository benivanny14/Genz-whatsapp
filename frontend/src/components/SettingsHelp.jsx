import React, { useState } from 'react';
import { HelpCircle, X, Search, MessageCircle, Book, AlertCircle, Mail, ExternalLink, ChevronRight, ChevronDown, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUPPORT_URL = 'https://github.com/benivanny14/Genz-whatsapp/issues';

const SettingsHelp = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showContact, setShowContact] = useState(false);

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
      content: 'Open the app and tap "Create account". Enter a username, your phone number, and a strong password (at least 6 characters with a mix of letters, numbers and symbols). You will receive a one-time code to verify your phone number before you can start chatting.',
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Adding contacts',
      content: 'Tap the new chat icon and search for a contact by username or phone number. If your contacts are stored on the phone, they can be imported from the Contacts settings page.',
    },
    {
      id: 3,
      category: 'features',
      title: 'Sending messages',
      content: 'Open a chat, type your message, and press send. You can send text, images, documents, and voice notes. Messages show a checkmark once delivered and double checkmark once read.',
    },
    {
      id: 4,
      category: 'features',
      title: 'Status updates',
      content: 'Share photos or text with your contacts for 24 hours. Tap the Status tab, then the camera icon to create a new status. You can control who sees your status from Status Privacy in Settings.',
    },
    {
      id: 5,
      category: 'features',
      title: 'Privacy & security',
      content: 'Control who sees your last seen and online status, enable two-factor authentication, and use linked devices from the Security settings page. You can also report abusive users from the chat menu.',
    },
    {
      id: 6,
      category: 'troubleshooting',
      title: 'Connection issues',
      content: 'Make sure you are connected to the internet and the server is reachable. Try toggling airplane mode, restarting the app, or checking the status of the GENZ server on the deployment dashboard.',
    },
    {
      id: 7,
      category: 'troubleshooting',
      title: 'App not loading',
      content: 'Clear the browser cache or reload the page. If the app stays stuck, log out and log back in, or check that your browser allows notifications and local storage for this site.',
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
          {showContact ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-[#0b141a] border border-[#00a884]/20">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-[#00a884]" /> Contact Support
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  Found a bug or have a suggestion? Open an issue on our GitHub repository with as much detail as possible — your device, browser, and what you were doing when it happened.
                </p>
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#00a884]/10 text-[#00a884] py-3 rounded-lg hover:bg-[#00a884]/20 transition-colors"
                >
                  <Bug size={18} /> Open a GitHub issue <ExternalLink size={14} />
                </a>
              </div>
              <button
                onClick={() => setShowContact(false)}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2 flex items-center justify-center gap-1"
              >
                <ChevronDown size={16} className="rotate-180" /> Back to articles
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map(article => {
                const expanded = expandedId === article.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => setExpandedId(expanded ? null : article.id)}
                    className={`w-full p-4 rounded-lg bg-[#0b141a] border transition-colors text-left ${
                      expanded ? 'border-[#00a884]' : 'border-[#00a884]/20 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{article.title}</p>
                        {expanded ? (
                          <p className="text-gray-300 text-sm leading-relaxed">{article.content}</p>
                        ) : (
                          <p className="text-gray-400 text-sm line-clamp-2">{article.content}</p>
                        )}
                      </div>
                      {expanded ? (
                        <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!showContact && filteredArticles.length === 0 && (
            <div className="text-center py-8">
              <HelpCircle className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No help articles found</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => setShowContact(!showContact)}
            className="w-full bg-[#00a884]/10 text-[#00a884] py-3 rounded-lg hover:bg-[#00a884]/20 transition-colors flex items-center justify-center gap-2"
          >
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
