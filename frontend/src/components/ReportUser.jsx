import React, { useState } from 'react';
import { Flag, X, AlertTriangle, Check, Send, RefreshCw, Shield, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReportUser = ({ user, onReport, onClose }) => {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportTypes = [
    { id: 'spam', label: 'Spam', description: 'Sending unsolicited messages' },
    { id: 'harassment', label: 'Harassment', description: 'Inappropriate or threatening behavior' },
    { id: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
    { id: 'scam', label: 'Scam', description: 'Attempting to defraud or deceive' },
    { id: 'inappropriate', label: 'Inappropriate content', description: 'Sharing offensive or harmful content' },
    { id: 'other', label: 'Other', description: 'Other violation' },
  ];

  const handleSubmit = async () => {
    if (!reportType) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (onReport) {
      onReport(user._id, {
        type: reportType,
        description
      });
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="text-red-500" size={20} />
          <h3 className="text-white font-semibold">Report User</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {!submitted ? (
        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-[#0b141a] rounded-lg">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-medium">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-gray-400 text-sm">{user.phone}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Your report will be reviewed by our team. The user will not be notified that you reported them.
              </p>
            </div>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Why are you reporting this user?</label>
            <div className="space-y-2">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    reportType === type.id
                      ? 'bg-red-500/20 border-2 border-red-500'
                      : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{type.label}</p>
                      <p className="text-gray-400 text-xs">{type.description}</p>
                    </div>
                    {reportType === type.id && <Check size={18} className="text-red-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Additional details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more information about the incident..."
              rows={3}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none text-sm"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!reportType || isSubmitting}
            className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Report
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center py-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Report Submitted</h3>
          <p className="text-gray-400 text-sm">
            Thank you for helping keep our community safe. We'll review your report and take appropriate action.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Report Button Component
export const ReportButton = ({ user, onReport }) => {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowReportModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Report user"
      >
        <Flag size={16} />
      </button>

      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <ReportUser
              user={user}
              onReport={(userId, reportData) => {
                onReport(userId, reportData);
                setShowReportModal(false);
              }}
              onClose={() => setShowReportModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Report Settings Component
export const ReportSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Flag size={18} className="text-[#00a884]" />
            Report Users
          </p>
          <p className="text-gray-400 text-sm">Report inappropriate behavior</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, reportUsersEnabled: !settings.reportUsersEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.reportUsersEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.reportUsersEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.reportUsersEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-block after report</p>
              <p className="text-gray-400 text-xs">Block user when reporting</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoBlockAfterReport: !settings.autoBlockAfterReport })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoBlockAfterReport ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoBlockAfterReport ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Report notifications</p>
              <p className="text-gray-400 text-xs">Get updates on report status</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reportNotifications: !settings.reportNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reportNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reportNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Report History Component
export const ReportHistory = ({ reports }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <FileText size={18} className="text-[#00a884]" />
        Report History ({reports.length})
      </h3>

      <div className="space-y-2">
        {reports.map(report => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{report.reportedUser}</span>
                  <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs capitalize">
                    {report.type}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  Reported {new Date(report.reportedAt).toLocaleDateString()}
                </p>
                {report.description && (
                  <p className="text-gray-300 text-sm mt-2 line-clamp-2">{report.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {report.status === 'pending' && (
                  <span className="text-yellow-500 text-xs">Pending</span>
                )}
                {report.status === 'reviewed' && (
                  <span className="text-blue-500 text-xs">Reviewed</span>
                )}
                {report.status === 'resolved' && (
                  <span className="text-green-500 text-xs">Resolved</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Shield className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No reports submitted</p>
        </div>
      )}
    </div>
  );
};

export default ReportUser;
