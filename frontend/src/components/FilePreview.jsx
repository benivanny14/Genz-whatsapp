import React from 'react';
import { FileText, Download, X, Image, Video, Music } from 'lucide-react';

const FilePreview = ({ fileUrl, fileName, onClose }) => {
  const getFileIcon = (fileName, size = 24) => {
    const ext = fileName?.split('.').pop().toLowerCase() || '';
    if (['pdf'].includes(ext)) return <FileText className="text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="text-blue-500" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText className="text-green-500" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <Image size={size} className="text-purple-500" />;
    if (['mp4', 'webm'].includes(ext)) return <Video size={size} className="text-orange-500" />;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return <Music size={size} className="text-pink-500" />;
    if (['txt'].includes(ext)) return <FileText className="text-gray-500" />;
    return <FileText className="text-gray-400" />;
  };

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-dark-bg flex justify-between items-center border-b border-dark-border">
          <div className="flex items-center gap-3">
            {getFileIcon(fileName)}
            <h3 className="text-dark-text font-medium truncate">{fileName}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-dark-hover p-1 rounded-full text-dark-text">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
          {getFileIcon(fileName, 64)}
          <p className="text-dark-textSecondary mt-4 text-center">
            File preview is not available for this file type.<br />
            Click the button below to download.
          </p>
          <button
            onClick={handleDownload}
            className="mt-6 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Download File
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
