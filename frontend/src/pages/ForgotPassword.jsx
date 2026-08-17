import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Key, Eye, EyeOff, Lock, Check, ShieldAlert } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { useAuth } from '../context/AuthContext';

const API_URL = resolveApiBase();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{12,}$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1: enter phone/email, 2: OTP, 3: new password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isPasswordStrong = PASSWORD_REGEX.test(password);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: identifier })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Failed to send OTP');
        return;
      }
      // In dev/test the OTP is returned in the response; in production it goes
      // out via SMS and the user types what they received.
      if (data.otp) {
        setOtp(String(data.otp));
      }
      setSuccess('OTP sent. Enter the 6-digit code to continue.');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isPasswordStrong) {
      setError('Password must include uppercase, lowercase, number, and special character (min 12)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: identifier, otp, newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Failed to reset password');
        return;
      }
      setSuccess('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              step >= n
                ? 'bg-[#00a884] border-[#00a884] text-white'
                : 'border-slate-600 text-slate-400'
            }`}
          >
            {n === 3 ? <Key size={14} /> : n}
          </div>
          {n < 3 && <div className="w-8 h-px bg-slate-600" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(900px 600px at 20% 15%, rgba(255,45,120,0.22), transparent 55%), radial-gradient(800px 600px at 85% 85%, rgba(124,92,255,0.22), transparent 55%), radial-gradient(700px 500px at 65% 30%, rgba(0,217,166,0.12), transparent 50%), #0c0a1e' }}>
      <div className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl genz-card">
        <div className="flex items-center mb-4">
          <button onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="genz-display text-2xl text-white ml-2">
            {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
          </h1>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {success}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Phone number or email</label>
              <div className="flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
                <Phone size={18} className="text-[#00a884]" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+255... or name@example.com"
                  autoComplete="tel"
                  required
                  className="w-full bg-transparent py-3 text-white outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#ff2d78] hover:bg-[#d61a5e] py-3 font-bold text-white transition-colors disabled:opacity-60 genz-sticker"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <p className="text-center text-sm text-slate-400">
              <Link to="/login" className="text-[#00a884] hover:underline">Back to login</Link>
            </p>
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-slate-500">
              <Link to="/terms" className="hover:text-[#00a884] transition-colors">Terms</Link>
              <span className="text-white/15">•</span>
              <Link to="/privacy-policy" className="hover:text-[#00a884] transition-colors">Privacy Policy</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
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
                className="w-full px-3 py-3 bg-[#202c33] border border-white/10 rounded-md text-white outline-none"
                placeholder="Enter the code sent to you"
              />
            </div>
            <button type="submit" disabled={otp.length < 6} className="w-full flex items-center justify-center gap-2 rounded-md bg-[#ff2d78] hover:bg-[#d61a5e] py-3 font-bold text-white transition-colors disabled:opacity-60 genz-sticker">
              Continue
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <label className="block text-sm text-slate-300 mb-2">New password</label>
              <div className="flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
                <Lock size={18} className="text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  className="w-full bg-transparent py-3 text-white outline-none"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className={`flex items-center gap-1 ${isPasswordStrong ? 'text-green-400' : 'text-yellow-400'}`}>
                    <Check size={12} /> {isPasswordStrong ? 'Password is strong' : 'Min 12: upper, lower, number, special'}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm text-slate-300 mb-2">Confirm new password</label>
              <div className="flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
                <Lock size={18} className="text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  className="w-full bg-transparent py-3 text-white outline-none"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-slate-300">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !isPasswordStrong || password !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#ff2d78] hover:bg-[#d61a5e] py-3 font-bold text-white transition-colors disabled:opacity-60 genz-sticker"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
