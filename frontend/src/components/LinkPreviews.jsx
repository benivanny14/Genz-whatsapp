import React, { useState, useEffect } from 'react';
import { Link, X, ExternalLink, Image as ImageIcon, Globe, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LinkPreviews = ({ links, onPreview, onClose }) => {
  const [previewData, setPreviewData] = useState({});
  const [isLoading, setIsLoading] = useState({});

  useEffect(() => {
    const fetchPreviews = async () => {
      for (const link of links) {
        setIsLoading(prev => ({ ...prev, [link.url]: true }));
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPreviewData(prev => ({
          ...prev,
          [link.url]: {
            title: link.url.split('/')[2] || 'Link Preview',
            description: 'Preview description for the link',
            image: null,
            favicon: null
          }
        }));
        setIsLoading(prev => ({ ...prev, [link.url]: false }));
      }
    };

    if (links.length > 0) {
      fetchPreviews();
    }
  }, [links]);

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
              <Link size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Link Previews</h2>
              <p className="text-gray-400 text-sm">{links.length} links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {links.map(link => {
              const preview = previewData[link.url];
              const loading = isLoading[link.url];

              return (
                <motion.div
                  key={link.url}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b141a] rounded-lg overflow-hidden border border-[#00a884]/20"
                >
                  {loading ? (
                    <div className="p-4 flex items-center justify-center">
                      <RefreshCw className="animate-spin text-[#00a884]" size={24} />
                    </div>
                  ) : preview ? (
                    <div>
                      {preview.image && (
                        <div className="w-full h-32 bg-[#1a2e35] flex items-center justify-center">
                          <ImageIcon size={32} className="text-gray-600" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {preview.favicon && (
                            <Globe size={14} className="text-gray-400" />
                          )}
                          <span className="text-gray-400 text-xs">{new URL(link.url).hostname}</span>
                        </div>
                        <h3 className="text-white font-medium mb-1">{preview.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{preview.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00a884] text-sm hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={14} />
                            Open link
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <AlertTriangle size={16} />
                        <span className="text-sm">Could not load preview</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {links.length === 0 && (
            <div className="text-center py-12">
              <Link className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No links found</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Link Preview Card Component
export const LinkPreviewCard = ({ link, preview, onOpen }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpen}
      className="bg-[#0b141a] rounded-lg overflow-hidden border border-[#00a884]/20 cursor-pointer hover:border-[#00a884] transition-colors"
    >
      {preview?.image && (
        <div className="w-full h-32 bg-[#1a2e35] flex items-center justify-center">
          <ImageIcon size={32} className="text-gray-600" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={14} className="text-gray-400" />
          <span className="text-gray-400 text-xs">{new URL(link).hostname}</span>
        </div>
        <h3 className="text-white font-medium mb-1">{preview?.title || 'Link Preview'}</h3>
        <p className="text-gray-400 text-sm line-clamp-2">{preview?.description || 'No description available'}</p>
      </div>
    </motion.div>
  );
};

// Inline Link Preview Component
export const InlineLinkPreview = ({ link, preview }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg overflow-hidden border border-[#00a884]/20 my-2"
    >
      <div className="flex">
        {preview?.image && (
          <div className="w-24 h-24 bg-[#1a2e35] flex items-center justify-center flex-shrink-0">
            <ImageIcon size={24} className="text-gray-600" />
          </div>
        )}
        <div className="p-3 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={12} className="text-gray-400" />
            <span className="text-gray-400 text-xs">{new URL(link).hostname}</span>
          </div>
          <h3 className="text-white text-sm font-medium mb-1">{preview?.title || 'Link Preview'}</h3>
          <p className="text-gray-400 text-xs line-clamp-2">{preview?.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Link Preview Settings Component
export const LinkPreviewSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Link size={18} className="text-[#00a884]" />
            Link Previews
          </p>
          <p className="text-gray-400 text-sm">Show link previews</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, linkPreviewsEnabled: !settings.linkPreviewsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.linkPreviewsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.linkPreviewsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.linkPreviewsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show images</p>
              <p className="text-gray-400 text-xs">Display preview images</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showPreviewImages: !settings.showPreviewImages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showPreviewImages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showPreviewImages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-load previews</p>
              <p className="text-gray-400 text-xs">Load automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoLoadPreviews: !settings.autoLoadPreviews })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoLoadPreviews ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoLoadPreviews ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show domain</p>
              <p className="text-gray-400 text-xs">Display website domain</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showPreviewDomain: !settings.showPreviewDomain })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showPreviewDomain ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showPreviewDomain ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Link Extractor Component
export const LinkExtractor = ({ text }) => {
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const links = text.match(linkRegex) || [];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, index) => (
        <a
          key={index}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00a884] hover:underline text-sm flex items-center gap-1"
        >
          <ExternalLink size={12} />
          {link.length > 30 ? link.substring(0, 30) + '...' : link}
        </a>
      ))}
    </div>
  );
};

// Link Preview Button Component
export const LinkPreviewButton = ({ onOpen, linkCount }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Link previews"
    >
      <Link size={18} />
      {linkCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {linkCount}
        </span>
      )}
    </button>
  );
};

export default LinkPreviews;
