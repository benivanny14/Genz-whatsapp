import React from 'react';
import { FileText, FileSpreadsheet, Image as ImageIcon, File, Download, ExternalLink } from 'lucide-react';

const DocumentMessage = ({ fileName, fileSize, fileUrl, messageType }) => {
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (['pdf'].includes(ext)) return <FileText size={24} className="text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={24} className="text-blue-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={24} className="text-green-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon size={24} className="text-purple-500" />;
    if (['txt', 'md'].includes(ext)) return <FileText size={24} className="text-gray-500" />;
    
    return <File size={24} className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isPdf = fileName?.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  };

  const handlePreview = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#202c33] rounded-lg p-3 max-w-xs">
      <div className="flex-shrink-0">
        {getFileIcon(fileName)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {fileName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(fileSize)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isPdf && (
          <button
            onClick={handlePreview}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            title="Preview"
          >
            <ExternalLink size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          title="Download"
        >
          <Download size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
};

export default DocumentMessage;
