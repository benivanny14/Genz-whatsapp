import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { buildShareUrl } from '../utils/statusShareToken';
import { X, QrCode, Download, Share2, Copy, Link, Scan } from 'lucide-react';

const StatusQRCodePanel = ({ onClose, status }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [qrStyle, setQrStyle] = useState('square');
  const [qrColor, setQrColor] = useState('#000000');
  const [qrSize, setQrSize] = useState(256);
  const [includeLogo, setIncludeLogo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const qrStyles = [
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'dots', label: 'Dots' },
    { id: 'circle', label: 'Circle' }
  ];

  const colors = [
    { id: '#000000', label: 'Black' },
    { id: '#00a884', label: 'Green' },
    { id: '#3b82f6', label: 'Blue' },
    { id: '#ef4444', label: 'Red' },
    { id: '#f59e0b', label: 'Orange' },
    { id: '#8b5cf6', label: 'Purple' }
  ];

  useEffect(() => {
    generateQRCode();
  }, [qrStyle, qrColor, qrSize, includeLogo]);

  const resolveStatusUrl = async () => {
    const custom = customUrl.trim();
    if (custom) return custom;
    return buildShareUrl(status?._id || status?.id);
  };

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      const token = getAuthToken();
      // Owner statuses get an expiring share token so the QR works for anyone;
      // everyone else falls back to the plain (logged-in-only) link.
      const statusUrl = await resolveStatusUrl();
      setShareUrl(statusUrl);
      
      const response = await fetch(`${resolveApiBase()}/status-advanced/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: statusUrl,
          statusId: status?._id || status?.id || '',
          style: qrStyle,
          color: qrColor,
          size: qrSize,
          includeLogo
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to external API
      const statusUrl = customUrl.trim() || `${window.location.origin}/status/${status?._id || status?.id}`;
      setShareUrl(statusUrl);
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(statusUrl)}&color=${qrColor.replace('#', '')}`;
      setQrCodeUrl(apiUrl);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `status-qr-${Date.now()}.png`;
    link.click();
  };

  const handleCopyLink = async () => {
    const statusUrl = shareUrl || await resolveStatusUrl();
    setShareUrl(statusUrl);
    navigator.clipboard.writeText(statusUrl);
  };

  const handleShare = async () => {
    const statusUrl = shareUrl || await resolveStatusUrl();
    setShareUrl(statusUrl);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this status',
          url: statusUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <QrCode className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status QR Code</h2>
              <p className="text-white/60 text-xs">Share status via QR code</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* QR Code Display */}
          <div className="bg-white rounded-xl p-4 flex items-center justify-center">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <Scan size={48} className="text-gray-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* Custom URL */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Custom URL (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Enter custom URL..."
                className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
              />
              <button
                type="button"
                onClick={generateQRCode}
                className="px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-xl text-white"
              >
                Generate
              </button>
            </div>
          </div>

          {/* QR Style */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">QR Style</label>
            <div className="grid grid-cols-4 gap-2">
              {qrStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setQrStyle(style.id)}
                  className={`p-3 rounded-xl text-sm transition-colors ${
                    qrStyle === style.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Color */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">QR Color</label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setQrColor(color.id)}
                  className={`w-10 h-10 rounded-xl transition-colors ${
                    qrColor === color.id ? 'ring-2 ring-[#00a884]' : ''
                  }`}
                  style={{ backgroundColor: color.id }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* QR Size */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Size: {qrSize}px</label>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={qrSize}
              onChange={(e) => setQrSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Include Logo */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
            />
            <span className="text-white text-sm">Include logo in center</span>
          </label>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Copy size={18} />
              Copy Link
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            type="button"
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

export default StatusQRCodePanel;
