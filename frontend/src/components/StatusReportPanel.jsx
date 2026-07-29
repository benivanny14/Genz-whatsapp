import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';

const StatusReportPanel = ({ onClose, status, onReportSubmit }) => {
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportCategories = [
    { id: 'inappropriate', label: 'Inappropriate Content', icon: AlertTriangle },
    { id: 'spam', label: 'Spam', icon: MessageSquare },
    { id: 'harassment', label: 'Harassment', icon: Flag },
    { id: 'fake', label: 'Fake/Misleading', icon: AlertTriangle },
    { id: 'copyright', label: 'Copyright Violation', icon: Flag },
    { id: 'other', label: 'Other', icon: MessageSquare }
  ];

  const handleSubmit = async () => {
    if (!reportCategory) {
      alert('Please select a report category');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: reportCategory,
          reason: reportReason,
          additionalInfo
        })
      });

      const data = await response.json();
      if (data.success) {
        const reportData = {
          statusId: status?._id || status?.id,
          category: reportCategory,
          reason: reportReason,
          additionalInfo,
          submittedAt: new Date().toISOString()
        };

        if (onReportSubmit) {
          onReportSubmit(reportData);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Flag className="text-red-500" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Report Status</h2>
              <p className="text-white/60 text-xs">Report inappropriate content</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Report Category */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Report Category</label>
            <div className="grid grid-cols-2 gap-2">
              {reportCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setReportCategory(category.id)}
                    className={`p-3 rounded-xl flex items-center gap-2 transition-colors ${
                      reportCategory === category.id
                        ? 'bg-red-500/20 border border-red-500 text-white'
                        : 'bg-white/10 border border-transparent text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Reason */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Why are you reporting this?</label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe why you're reporting this status..."
              rows={3}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Additional Information (Optional)</label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Status Being Reported</p>
            <p className="text-white text-sm">{status?.content || status?.caption || 'No content'}</p>
            <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
              <span>By: {status?.username || 'Unknown'}</span>
              <span>•</span>
              <span>{new Date(status?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" size={18} />
            <p className="text-yellow-400 text-sm">False reports may result in account restrictions</p>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSubmit}
            disabled={!reportCategory || isSubmitting}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag size={20} />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusReportPanel;
