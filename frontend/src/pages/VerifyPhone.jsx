import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Phone, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';

const formatPhoneForRequest = (phone) => {
  let formatted = String(phone || '').trim();
  if (!formatted) return '';
  if (!formatted.startsWith('+')) {
    formatted = '+255' + formatted.replace(/^0/, '');
  }
  return formatted;
};

const VerifyPhone = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setIsAuthenticated, setUser: setAuthUser } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone') || user?.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
      return;
    }
    if (!autoSentRef.current) {
      autoSentRef.current = true;
      handleSendOtp();
    }
  }, [phoneNumber, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    const formattedPhone = formatPhoneForRequest(phoneNumber);
    if (!formattedPhone) {
      setError('Invalid phone number');
      return;
    }

    setResendLoading(true);
    setError('');

    try {
      const result = await authService.resendPhoneOTP({ phoneNumber: formattedPhone });
      if (result?.success) {
        setSuccess('OTP sent successfully!');
        setOtpSent(true);
        setCountdown(60);
        setCanResend(false);
        if (result.otp) {
          setOtp(String(result.otp));
        }
      } else {
        setError(result?.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authService.verifyPhoneOTP({
        phoneNumber: formatPhoneForRequest(phoneNumber),
        otp
      });

      if (res?.success) {
        const updatedUser = { ...user, phoneVerified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        setAuthUser(updatedUser);
        setIsAuthenticated(true);

        setSuccess('Phone verified successfully!');
        setTimeout(() => navigate('/chat'), 1500);
      } else {
        setError(res?.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    handleSendOtp();
  };

  if (!phoneNumber) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(900px 600px at 20% 15%, rgba(255,45,120,0.22), transparent 55%), radial-gradient(800px 600px at 85% 85%, rgba(124,92,255,0.22), transparent 55%), radial-gradient(700px 500px at 65% 30%, rgba(0,217,166,0.12), transparent 50%), #0c0a1e' }}>
      <div className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl genz-card">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate('/login')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="genz-display text-2xl text-white ml-2">Verify Phone</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200 flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="mb-6">
          <p className="text-slate-300 text-sm mb-2">
            Enter the 6-digit code sent to:
          </p>
          <div className="flex items-center gap-2 text-white font-medium">
            <Phone size={18} className="text-[#00a884]" />
            <span>{phoneNumber}</span>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">6-digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-3 py-3 bg-[#202c33] border border-white/10 rounded-md text-white outline-none text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-bold text-white transition-colors disabled:opacity-60 genz-sticker"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={!canResend || resendLoading}
            className="text-sm text-[#00a884] hover:underline disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
            {resendLoading ? 'Sending...' : canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;
