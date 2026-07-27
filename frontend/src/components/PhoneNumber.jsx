import React, { useState } from 'react';
import { Phone, X, Check, RefreshCw, Edit2, Shield, AlertTriangle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PhoneNumber = ({ user, onUpdate, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(user?.countryCode || '+254');
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('view'); // view, edit, verify
  const [error, setError] = useState('');

  const countryCodes = [
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
  ];

  const handleEdit = () => {
    setIsEditing(true);
    setStep('edit');
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');

    // Simulate verification code sending
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsVerifying(false);
    setStep('verify');
  };

  const handleConfirmVerification = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsVerifying(false);

    if (onUpdate) {
      onUpdate({
        phoneNumber,
        countryCode
      });
    }

    setIsEditing(false);
    setStep('view');
    setVerificationCode('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setStep('view');
    setPhoneNumber(user?.phoneNumber || '');
    setCountryCode(user?.countryCode || '+254');
    setVerificationCode('');
    setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Phone className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Phone Number</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* View Mode */}
        {step === 'view' && (
          <div className="space-y-4">
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                  <Phone size={24} className="text-[#00a884]" />
                </div>
                <div>
                  <p className="text-white text-lg font-medium">{countryCode} {phoneNumber}</p>
                  <p className="text-gray-400 text-sm">Verified</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-blue-500 text-xs">
                  Your phone number is verified and used for account security and two-factor authentication.
                </p>
              </div>
            </div>

            <button
              onClick={handleEdit}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 size={18} />
              Change Phone Number
            </button>
          </div>
        )}

        {/* Edit Mode */}
        {step === 'edit' && (
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Country code</p>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                {countryCodes.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.country} ({country.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">Phone number</p>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="712345678"
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-red-500 text-xs">{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={isVerifying || !phoneNumber}
                className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Verify
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Verify Mode */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-[#00a884]" />
              </div>
              <p className="text-white font-medium mb-2">Enter verification code</p>
              <p className="text-gray-400 text-sm">
                We sent a 6-digit code to {countryCode} {phoneNumber}
              </p>
            </div>

            <div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-center text-2xl tracking-widest"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-red-500 text-xs">{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerification}
                disabled={isVerifying || verificationCode.length !== 6}
                className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Phone Number Display Component
export const PhoneNumberDisplay = ({ phoneNumber, countryCode, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
    >
      <Phone size={14} />
      <span className="text-sm">{countryCode} {phoneNumber}</span>
    </button>
  );
};

// Phone Number Badge Component
export const PhoneNumberBadge = ({ phoneNumber, countryCode, verified }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      <Phone size={14} className="text-gray-400" />
      <span className="text-white text-sm">{countryCode} {phoneNumber}</span>
      {verified && (
        <Check size={12} className="text-[#00a884]" />
      )}
    </motion.div>
  );
};

export default PhoneNumber;
