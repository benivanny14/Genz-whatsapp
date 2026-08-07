import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Phone, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { useAuth } from '../context/AuthContext';

const API_URL = resolveApiBase();

const VerifyPhone = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone') || user?.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0 && !canResend) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, canResend]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!phoneNumber || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Failed to verify OTP');
        return;
      }
      setSuccess('Phone number verified successfully!');
      setTimeout(() => navigate('/chat'), 2000);
    } catch (err) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/auth/resend-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Failed to resend OTP');
        return;
      }
      if (data.otp) {
        setOtp(String(data.otp));
      }
      setSuccess('New OTP sent successfully');
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setError(err?.message || 'Network error');
    } finally {
      setResendLoading(false);
    }
  };

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
