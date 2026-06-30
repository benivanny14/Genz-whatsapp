import React, { useState } from 'react';
import { Mail, X, CheckCircle, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const EmailVerification = ({ onClose, email: initialEmail }) => {
  const { sendEmailVerification, verifyEmail, resendEmailVerification } = useChat();
  const [email, setEmail] = useState(initialEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('enter'); // enter, verify, success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendVerification = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await sendEmailVerification(email);
      if (result.success) {
        setStep('verify');
        startCountdown(60);
      } else {
        setError(result.message || 'Failed to send verification email');
      }
    } catch (err) {
      setError('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyEmail(verificationCode);
      if (result.success) {
        setStep('success');
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await resendEmailVerification(email);
      if (result.success) {
        startCountdown(60);
      } else {
        setError(result.message || 'Failed to resend verification code');
      }
    } catch (err) {
      setError('Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-2xl w-full max-w-md border border-dark-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-dark-text">Email Verification</h2>
          </div>
          <button onClick={onClose} className="text-dark-textSecondary hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'enter' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Mail className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                <h3 className="text-xl font-bold text-dark-text mb-2">Verify Your Email</h3>
                <p className="text-sm text-dark-textSecondary">
                  Enter your email address to receive a verification code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-primary-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={handleSendVerification}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : <><Send size={18} /> Send Verification Code</>}
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-text mb-2">Enter Verification Code</h3>
                <p className="text-sm text-dark-textSecondary mb-1">
                  We've sent a 6-digit code to
                </p>
                <p className="text-sm font-medium text-primary-500">{email}</p>
              </div>

              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="000000"
                className="w-full bg-dark-bg border border-dark-border rounded-lg p-4 text-center text-2xl font-mono tracking-widest text-dark-text focus:outline-none focus:border-primary-500"
                maxLength={6}
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyEmail}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="text-center">
                <p className="text-sm text-dark-textSecondary mb-2">Didn't receive the code?</p>
                <button
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-dark-text">Email Verified!</h3>
              <p className="text-sm text-dark-textSecondary">
                Your email has been successfully verified.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
