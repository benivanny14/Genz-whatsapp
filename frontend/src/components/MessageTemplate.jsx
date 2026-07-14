import React, { useState } from 'react';
import { FileText, X, Check, RefreshCw, Plus, Trash2, Edit2, Search, Copy, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageTemplate = ({ templates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate, onUseTemplate, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'general'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    { id: 'general', label: 'General' },
    { id: 'greeting', label: 'Greeting' },
    { id: 'business', label: 'Business' },
    { id: 'support', label: 'Support' },
    { id: 'personal', label: 'Personal' },
  ];

  const filteredTemplates = templates.filter(template =>
    template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    const template = {
      id: Date.now(),
      ...newTemplate,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    onCreateTemplate?.(template);
    setNewTemplate({ name: '', content: '', category: 'general' });
    setShowCreateModal(false);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      content: template.content,
      category: template.category
    });
    setShowCreateModal(true);
  };

  const handleUpdateTemplate = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    const updatedTemplate = {
      ...editingTemplate,
      ...newTemplate
    };

    onUpdateTemplate?.(updatedTemplate);
    setEditingTemplate(null);
    setNewTemplate({ name: '', content: '', category: 'general' });
    setShowCreateModal(false);
  };

  const handleDeleteTemplate = (templateId) => {
    onDeleteTemplate?.(templateId);
  };

  const handleUseTemplate = (template) => {
    onUseTemplate?.(template);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Message Templates</h2>
              <p className="text-gray-400 text-sm">{templates.length} templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredTemplates.map(template => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884]/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{template.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{template.category}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm line-clamp-2 mb-3">{template.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{template.usageCount || 0} uses</span>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="bg-[#00a884] text-white px-3 py-1 rounded-lg hover:bg-[#008f72] transition-colors text-sm flex items-center gap-1"
                  >
                    <Send size={12} />
                    Use
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8">
              <FileText className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No templates found</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingTemplate(null);
              setNewTemplate({ name: '', content: '', category: 'general' });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Template
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Template name</p>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Greeting message"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Category</p>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Message content</p>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Type your message template..."
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  disabled={isSaving || !newTemplate.name || !newTemplate.content}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      {editingTemplate ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Template Button Component
export const TemplateButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Message templates"
    >
      <FileText size={18} />
    </button>
  );
};

// Template Quick Select Component
export const TemplateQuickSelect = ({ templates, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Quick templates"
      >
        <FileText size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 w-64 bg-[#1a2e35] rounded-lg border border-[#00a884]/20 shadow-xl max-h-64 overflow-y-auto z-50"
          >
            {templates.slice(0, 5).map(template => (
              <button
                key={template._id}
                onClick={() => {
                  onSelect?.(template);
                  setIsOpen(false);
                }}
                className="w-full p-3 text-left hover:bg-[#00a884]/10 transition-colors border-b border-[#00a884]/10 last:border-0"
              >
                <p className="text-white text-sm font-medium">{template.name}</p>
                <p className="text-gray-400 text-xs line-clamp-1">{template.content}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Template Settings Component
export const TemplateSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <FileText size={18} className="text-[#00a884]" />
            Message Templates
          </p>
          <p className="text-gray-400 text-sm">Save and reuse message templates</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, templatesEnabled: !settings.templatesEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.templatesEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.templatesEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.templatesEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show template suggestions</p>
              <p className="text-gray-400 text-xs">Auto-complete with templates</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, templateSuggestions: !settings.templateSuggestions })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.templateSuggestions ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.templateSuggestions ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTemplate;
