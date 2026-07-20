import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Phone, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import OTPVerification from '../components/OTPVerification';
import { useAuth } from '../context/AuthContext';
import { resolveApiBase, fetchWithTimeout } from '../utils/resolveApiBase';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // FIX: ProtectedRoute sends unauthenticated visitors here with
  // state={{ from: location }} (e.g. from a /join/:groupId/:code invite
  // link). Previously login always redirected to /chat afterward, which
  // silently dropped invite links. Honor that, or an explicit ?redirect=.
  const fromPath = location.state?.from
    ? `${location.state.from.pathname || ''}${location.state.from.search || ''}`
    : '';
  const redirectTarget = fromPath || searchParams.get('redirect') || '/chat';
  const { login, completeSession } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials', 'otp', 'twoFactor'
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const validatePhoneNumber = (phone) => {
    // Tanzanian phone number format - accepts 06, 07, +255 6, +255 7
    const phoneRegex = /^(\+255|255|0)?[67]\d{8}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Invalid phone number format. Use format like: 06XX XXX XXX, 07XX XXX XXX or +255 6XX XXX XXX, +255 7XX XXX XXX');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const API_URL = resolveApiBase();
      
      // Store password temporarily for OTP verification
      localStorage.setItem('tempPassword', password);

      const response = await fetchWithTimeout(`${API_URL}/otp/request-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('otp');
        setShowOTP(true);
        toast.success('OTP sent successfully! Check your phone.');
      } else {
        setError(data.message || 'Failed to send OTP');
        localStorage.removeItem('tempPassword');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Login error:', err);
      localStorage.removeItem('tempPassword');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = resolveApiBase();
      
      const data = await login({ identifier: phoneNumber, password });

      if (data?.requiresTwoFactor) {
        // BUG FIX: this used to just show an error message ("Use OTP login
        // or verify 2FA") with no actual way to enter the 2FA code —
        // anyone with 2FA enabled could never log in with their password.
        setError('');
        setStep('twoFactor');
        return;
      }

      if (data?.success !== false && data?.token) {
        toast.success('Login successful!');
        navigate(redirectTarget, { replace: true });
      } else {
        setError(data?.message || 'Invalid credentials');
        setPassword('');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(twoFactorToken.trim())) {
      setError('Weka namba 6 za app yako ya 2FA (mfano Google Authenticator).');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ identifier: phoneNumber, password, twoFactorToken: twoFactorToken.trim() });

      if (data?.success !== false && data?.token) {
        toast.success('Login successful!');
        navigate(redirectTarget, { replace: true });
      } else {
        setError(data?.message || 'Namba ya 2FA si sahihi. Jaribu tena.');
        setTwoFactorToken('');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('2FA verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPOrLogin = (e) => {
    // If user wants to use OTP method
    handleRequestOTP(e);
  };

  const handleOTPComplete = (token, user) => {
    if (token && user) {
      completeSession({ token, user });
      navigate(redirectTarget, { replace: true });
    } else {
      // Go back to credentials
      setStep('credentials');
      setShowOTP(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setShowOTP(false);
    setTwoFactorToken('');
    setError('');
    localStorage.removeItem('tempPassword');
  };

  if (step === 'twoFactor') {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
        <form onSubmit={handleTwoFactorSubmit} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-white">Uthibitisho wa hatua mbili (2FA)</h1>
            <p className="text-sm text-slate-400 mt-1">
              Fungua app yako ya uthibitisho (mfano Google Authenticator) na weka namba 6 zinazoonekana hapo.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <label className="block text-sm text-slate-300 mb-2">Namba 6 za 2FA</label>
          <div className="mb-6 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
            <Lock size={18} className="text-[#00a884]" />
            <input
              value={twoFactorToken}
              onChange={(event) => setTwoFactorToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-transparent py-3 text-white outline-none tracking-[0.4em] text-center text-lg"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? 'Inathibitisha...' : 'Thibitisha na ingia'}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Rudi kwenye login
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showOTP) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
          <OTPVerification
            phoneNumber={phoneNumber}
            type="login"
            onComplete={handleOTPComplete}
          />
          <div className="mt-4 text-center">
            <button
              onClick={handleBackToLogin}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleOTPOrLogin} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">GENZ Login</h1>
          <p className="text-sm text-slate-400 mt-1">Log in to your account to continue.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-2">
          Namba ya simu (e.g. +255...)
        </label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Phone size={18} className="text-[#00a884]" />
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            placeholder="+255712345678"
            autoComplete="tel"
            required
          />
        </div>

        <label className="block text-sm text-slate-300 mb-2">Nenosiri</label>
        <div className="mb-6 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Lock size={18} className="text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            autoComplete="current-password"
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-300">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Login with OTP Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60 mb-3"
        >
          <Smartphone size={18} />
          {loading ? 'Inatuma OTP...' : 'Login with OTP'}
        </button>

        <div className="relative flex items-center justify-center mb-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#111b21] px-3 text-xs text-slate-400 uppercase">Au</span>
        </div>

        {/* Direct Login Button (without OTP) */}
        <button
          type="button"
          onClick={handleCredentialsLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-transparent border border-white/20 hover:bg-white/5 py-3 font-semibold text-white transition-colors disabled:opacity-50"
        >
          <LogIn size={18} />
          {loading ? 'Logging in...' : 'Login directly'}
        </button>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-[#00a884]">Forgot password?</Link>
          <Link to="/register" className="text-slate-300 hover:text-white transition-colors">Create account</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;