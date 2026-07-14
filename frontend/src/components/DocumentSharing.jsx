import React, { useState } from 'react';
import { FileText, Upload, X, Download, Trash2, Search, Filter, Check, File, Image as ImageIcon, Video, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DocumentSharing = ({ documents, onUpload, onDownload, onDelete, onShare, onClose }) => {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, pdf, doc, image, video, audio
  const [isUploading, setIsUploading] = useState(false);

  const documentTypes = {
    pdf: { icon: FileText, color: 'text-red-500' },
    doc: { icon: FileText, color: 'text-blue-500' },
    docx: { icon: FileText, color: 'text-blue-500' },
    image: { icon: ImageIcon, color: 'text-green-500' },
    video: { icon: Video, color: 'text-purple-500' },
    audio: { icon: Music, color: 'text-yellow-500' },
    default: { icon: File, color: 'text-gray-400' }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.category === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSelectDocument = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUploading(false);
    if (onUpload) {
      onUpload();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Documents</h2>
              <p className="text-gray-400 text-sm">{documents.length} files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'pdf', 'doc', 'image', 'video', 'audio'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                  filterType === type
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Documents */}
        {selectedDocuments.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{selectedDocuments.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onShare?.(selectedDocuments)}
                  className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
                >
                  Share
                </button>
                <button
                  onClick={() => setSelectedDocuments([])}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredDocuments.map(doc => {
              const typeConfig = documentTypes[doc.category] || documentTypes.default;
              const TypeIcon = typeConfig.icon;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#0b141a] rounded-lg p-4 border ${
                    selectedDocuments.includes(doc.id)
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => handleSelectDocument(doc.id)}
                      className="w-5 h-5 rounded"
                    />
                    <div className="w-12 h-12 bg-[#00a884]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TypeIcon size={24} className={typeConfig.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="capitalize">{doc.type}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDownload?.(doc.id)}
                        className="text-[#00a884] hover:text-white transition-colors"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => onDelete?.(doc.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No documents found' : 'No documents available'}
              </p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Upload className="animate-spin" size={18} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Document Sharing Button Component
export const DocumentButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Documents"
    >
      <FileText size={18} />
    </button>
  );
};

// Document Preview Component
export const DocumentPreview = ({ document, onDownload, onShare }) => {
  const documentTypes = {
    pdf: { icon: FileText, color: 'text-red-500' },
    doc: { icon: FileText, color: 'text-blue-500' },
    image: { icon: ImageIcon, color: 'text-green-500' },
    video: { icon: Video, color: 'text-purple-500' },
    default: { icon: File, color: 'text-gray-400' }
  };

  const typeConfig = documentTypes[document.category] || documentTypes.default;
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
          <TypeIcon size={32} className={typeConfig.color} />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{document.name}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="capitalize">{document.type}</span>
            <span>•</span>
            <span>{document.size}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="text-[#00a884] hover:text-white transition-colors"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onShare}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Check size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Document Settings Component
export const DocumentSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <FileText size={18} className="text-[#00a884]" />
            Document Sharing
          </p>
          <p className="text-gray-400 text-sm">Share files securely</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, documentSharingEnabled: !settings.documentSharingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.documentSharingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.documentSharingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.documentSharingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Max file size</p>
            <select
              value={settings.maxFileSize || '100'}
              onChange={(e) => onUpdate({ ...settings, maxFileSize: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="50">50 MB</option>
              <option value="100">100 MB</option>
              <option value="500">500 MB</option>
              <option value="1000">1 GB</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-download documents</p>
              <p className="text-gray-400 text-xs">Download received files</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDownloadDocs: !settings.autoDownloadDocs })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDownloadDocs ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDownloadDocs ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Scan for viruses</p>
              <p className="text-gray-400 text-xs">Security scan on upload</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, scanForViruses: !settings.scanForViruses })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.scanForViruses ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.scanForViruses ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Recent Documents Component
export const RecentDocuments = ({ documents, onSelect }) => {
  const recentDocs = documents.slice(0, 5);
  const documentTypes = {
    pdf: { icon: FileText, color: 'text-red-500' },
    doc: { icon: FileText, color: 'text-blue-500' },
    image: { icon: ImageIcon, color: 'text-green-500' },
    default: { icon: File, color: 'text-gray-400' }
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Recent Documents</span>
      </div>
      <div className="space-y-2">
        {recentDocs.map(doc => {
          const typeConfig = documentTypes[doc.category] || documentTypes.default;
          const TypeIcon = typeConfig.icon;
          return (
            <button
              key={doc.id}
              onClick={() => onSelect?.(doc)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#00a884]/10 transition-colors"
            >
              <TypeIcon size={16} className={typeConfig.color} />
              <div className="flex-1 text-left">
                <p className="text-white text-sm truncate">{doc.name}</p>
                <p className="text-gray-500 text-xs">{doc.size}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentSharing;
