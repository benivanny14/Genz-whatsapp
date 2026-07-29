import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, FileText, Video, Music, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

const MediaUploadEnhanced = ({ onClose, onUpload, maxFiles = 1000, maxSize = 1024 * 1024 * 1024 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files);
    
    // Check if adding files would exceed max
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed ${maxSize / (1024 * 1024 * 1024)}GB limit`);
      return;
    }

    // Group files by type
    const newFiles = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      type: getFileType(file),
      preview: createPreview(file),
      size: formatFileSize(file.size)
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, [selectedFiles.length, maxFiles, maxSize]);

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return 'file';
  };

  const createPreview = (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const removeFile = (id) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload files in chunks to handle large number of files
      const chunkSize = 50;
      const chunks = [];
      
      for (let i = 0; i < selectedFiles.length; i += chunkSize) {
        chunks.push(selectedFiles.slice(i, i + chunkSize));
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        const uploadPromises = chunk.map(async (fileObj) => {
          try {
            const formData = new FormData();
            formData.append('file', fileObj.file);
            formData.append('type', fileObj.type);

            // Simulate upload progress
            for (let progress = 0; progress <= 100; progress += 10) {
              setUploadProgress(prev => ({
                ...prev,
                [fileObj.id]: progress
              }));
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            return { success: true, file: fileObj };
          } catch (err) {
            return { success: false, file: fileObj, error: err.message };
          }
        });

        const results = await Promise.all(uploadPromises);
        
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          setError(`${failed.length} files failed to upload`);
        }
      }

      if (onUpload) {
        await onUpload(selectedFiles);
      }

      // Clear uploaded files
      setSelectedFiles([]);
      setUploading(false);
      setUploadProgress({});

    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon size={24} />;
      case 'video': return <Video size={24} />;
      case 'audio': return <Music size={24} />;
      case 'pdf': return <FileText size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const clearAll = () => {
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setSelectedFiles([]);
    setUploadProgress({});
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Upload className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Enhanced Media Upload</h2>
              <p className="text-white/60 text-xs">Up to {maxFiles} files, {maxSize / (1024 * 1024 * 1024)}GB max</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#00a884] transition-colors mb-4"
          >
            <Upload className="text-[#00a884] mx-auto mb-3" size={48} />
            <p className="text-white font-medium mb-2">Click to select files</p>
            <p className="text-white/60 text-sm">or drag and drop here</p>
            <p className="text-white/40 text-xs mt-2">Images, Videos, Audio, Documents</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-400" size={20} />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">{selectedFiles.length} files selected</p>
                <button
                  onClick={clearAll}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {selectedFiles.map(file => (
                  <div key={file.id} className="bg-white/5 rounded-lg p-3 relative group">
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} className="text-white" />
                    </button>

                    <div className="aspect-square bg-black/30 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-[#00a884]">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    <p className="text-white text-xs truncate mb-1">{file.file.name}</p>
                    <p className="text-white/50 text-xs">{file.size}</p>

                    {uploading && uploadProgress[file.id] !== undefined && (
                      <div className="mt-2">
                        <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#00a884] h-full transition-all duration-300"
                            style={{ width: `${uploadProgress[file.id]}%` }}
                          />
                        </div>
                        <p className="text-white/50 text-xs mt-1">{uploadProgress[file.id]}%</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Stats */}
          {selectedFiles.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[#00a884] font-bold text-lg">{selectedFiles.length}</p>
                  <p className="text-white/60 text-xs">Files</p>
                </div>
                <div>
                  <p className="text-[#00a884] font-bold text-lg">
                    {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.file.size, 0))}
                  </p>
                  <p className="text-white/60 text-xs">Total Size</p>
                </div>
                <div>
                  <p className="text-[#00a884] font-bold text-lg">{maxFiles - selectedFiles.length}</p>
                  <p className="text-white/60 text-xs">Remaining</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Upload {selectedFiles.length} Files
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadEnhanced;
