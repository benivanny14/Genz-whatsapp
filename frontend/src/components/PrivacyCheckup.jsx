import React, { useState } from 'react';
import { Shield, X, Check, AlertTriangle, ChevronRight, Lock, Eye, RefreshCw, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PrivacyCheckup = ({ privacyData, onFixIssue, onDismiss, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFixing, setIsFixing] = useState(false);

  const steps = [
    {
      id: 'profile_photo',
      title: 'Profile Photo',
      description: 'Review who can see your profile photo',
      icon: User,
      status: privacyData?.profilePhotoStatus || 'warning',
      recommendation: 'Set to "My contacts" for better privacy'
    },
    {
      id: 'about',
      title: 'About',
      description: 'Review your about information visibility',
      icon: User,
      status: privacyData?.aboutStatus || 'warning',
      recommendation: 'Keep it minimal and set to contacts only'
    },
    {
      id: 'last_seen',
      title: 'Last Seen',
      description: 'Control when you were last online',
      icon: Eye,
      status: privacyData?.lastSeenStatus || 'warning',
      recommendation: 'Set to "Nobody" or "My contacts"'
    },
    {
      id: 'status',
      title: 'Status Privacy',
      description: 'Control who can see your status updates',
      icon: Eye,
      status: privacyData?.statusStatus || 'warning',
      recommendation: 'Share only with trusted contacts'
    },
    {
      id: 'groups',
      title: 'Group Privacy',
      description: 'Control who can add you to groups',
      icon: User,
      status: privacyData?.groupStatus || 'warning',
      recommendation: 'Set to "My contacts" to prevent strangers'
    },
    {
      id: 'blocked',
      title: 'Blocked Contacts',
      description: 'Review your blocked contacts list',
      icon: Shield,
      status: privacyData?.blockedStatus || 'good',
      recommendation: 'Block unwanted contacts'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <Check size={20} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'critical':
        return <AlertTriangle size={20} className="text-red-500" />;
      default:
        return <AlertTriangle size={20} className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'critical':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-yellow-500/30 bg-yellow-500/10';
    }
  };

  const handleFix = async (stepId) => {
    setIsFixing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsFixing(false);
    if (onFixIssue) {
      onFixIssue(stepId);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

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
              <Shield size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Privacy Checkup</h2>
              <p className="text-gray-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="w-full bg-[#0b141a] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#00a884] h-full rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`rounded-lg p-6 border ${getStatusColor(currentStepData.status)}`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <StepIcon size={24} className="text-[#00a884]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white text-lg font-semibold">{currentStepData.title}</h3>
                  {getStatusIcon(currentStepData.status)}
                </div>
                <p className="text-gray-400 text-sm mb-3">{currentStepData.description}</p>
                <div className="bg-[#0b141a] rounded-lg p-3">
                  <p className="text-gray-300 text-sm flex items-start gap-2">
                    <Settings size={14} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                    <span>{currentStepData.recommendation}</span>
                  </p>
                </div>
              </div>
            </div>

            {currentStepData.status !== 'good' && (
              <button
                onClick={() => handleFix(currentStepData.id)}
                disabled={isFixing}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Fix Now
                  </>
                )}
              </button>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-t border-[#00a884]/20 flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={currentStep === steps.length - 1 ? onClose : handleNext}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Privacy Checkup Button Component
export const PrivacyCheckupButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Privacy checkup"
    >
      <Shield size={18} />
    </button>
  );
};

// Privacy Score Component
export const PrivacyScore = ({ score, issues }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">Privacy Score</span>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      {issues > 0 && (
        <div className="flex items-center gap-2 text-yellow-500 text-sm">
          <AlertTriangle size={14} />
          <span>{issues} issue{issues !== 1 ? 's' : ''} to fix</span>
        </div>
      )}
    </div>
  );
};

// Privacy Settings Quick Access Component
export const PrivacySettingsQuickAccess = ({ settings, onOpen }) => {
  const quickSettings = [
    { id: 'profile', label: 'Profile Photo', icon: User },
    { id: 'last_seen', label: 'Last Seen', icon: Eye },
    { id: 'status', label: 'Status Privacy', icon: Eye },
    { id: 'groups', label: 'Group Privacy', icon: User },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">Quick Privacy Settings</span>
        <button
          onClick={onOpen}
          className="text-[#00a884] hover:underline text-sm"
        >
          View All
        </button>
      </div>

      <div className="space-y-2">
        {quickSettings.map(setting => (
          <button
            key={setting.id}
            onClick={() => onOpen(setting.id)}
            className="w-full bg-[#0b141a] rounded-lg p-3 flex items-center gap-3 hover:bg-[#1a2e35] transition-colors"
          >
            <setting.icon size={18} className="text-gray-400" />
            <span className="text-white text-sm">{setting.label}</span>
            <ChevronRight size={16} className="text-gray-400 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PrivacyCheckup;
