import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Download, Image, Video, FileText, Music, CheckCircle, AlertCircle } from 'lucide-react';

const StatusDownloadPanel = ({ onClose, status, onDownload }) => {
  const [downloadQuality, setDownloadQuality] = useState('high');
  const [downloadFormat, setDownloadFormat] = useState('original');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const qualities = [
    { id: 'low', label: 'Low (480p)', size: '~2MB' },
    { id: 'medium', label: 'Medium (720p)', size: '~5MB' },
    { id: 'high', label: 'High (1080p)', size: '~15MB' },
    { id: 'original', label: 'Original', size: '~25MB' }
  ];

  const formats = ['original', 'mp4', 'webm', 'gif', 'jpg', 'png'];

  const handleDownload = async () => {
    if (!status?.mediaUrl) {
      alert('No media available for download');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const token = localStorage.getItem('token');
      
      // Call backend to record download
      await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quality: downloadQuality,
          format: downloadFormat
        })
      });

      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsDownloading(false);
        setDownloadProgress(0);

        const link = document.createElement('a');
        link.href = status.mediaUrl;
        link.download = `status-${status._id || status.id}-${downloadQuality}.${downloadFormat}`;
        link.click();

        if (onDownload) {
          onDownload({
            quality: downloadQuality,
            format: downloadFormat,
            statusId: status._id || status.id
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Error downloading status:', error);
      setIsDownloading(false);
      alert('Failed to download status. Please try again.');
    }
  };

  const getFileIcon = () => {
    switch (status?.type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'text': return FileText;
      case 'music': return Music;
      default: return FileText;
    }
  };

  const FileIcon = getFileIcon();

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Download className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Download Status</h2>
              <p className="text-white/60 text-xs">Save to your device</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <FileIcon size={24} className="text-[#00a884]" />
              </div>
              <div>
                <p className="text-white font-medium">{status?.type || 'Status'}</p>
                <p className="text-white/60 text-sm">{status?.content || status?.caption || 'No content'}</p>
              </div>
            </div>
            {status?.mediaUrl && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">Media URL</p>
                <p className="text-white text-xs truncate">{status.mediaUrl}</p>
              </div>
            )}
          </div>

          {/* Download Quality */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Quality</label>
            <div className="grid grid-cols-2 gap-2">
              {qualities.map((quality) => (
                <button
                  key={quality.id}
                  onClick={() => setDownloadQuality(quality.id)}
                  disabled={isDownloading}
                  className={`p-3 rounded-xl text-left transition-colors ${
                    downloadQuality === quality.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-50'
                  }`}
                >
                  <p className="font-medium text-sm">{quality.label}</p>
                  <p className="text-xs opacity-80">{quality.size}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Download Format */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Format</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => setDownloadFormat(format)}
                  disabled={isDownloading}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                    downloadFormat === format
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-50'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Downloading...</span>
                <span className="text-[#00a884] text-sm">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#00a884] h-2 rounded-full transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Warning */}
          {!status?.mediaUrl && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="text-yellow-400" size={18} />
              <p className="text-yellow-400 text-sm">This status has no media to download</p>
            </div>
          )}

          {/* Download Info */}
          {status?.mediaUrl && (
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2">Download Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Quality</span>
                  <span className="text-white capitalize">{downloadQuality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Format</span>
                  <span className="text-white uppercase">{downloadFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Estimated Size</span>
                  <span className="text-white">{qualities.find(q => q.id === downloadQuality)?.size}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleDownload}
            disabled={!status?.mediaUrl || isDownloading}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={20} />
                Download Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDownloadPanel;
