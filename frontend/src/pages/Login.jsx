import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Phone, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import OTPVerification from '../components/OTPVerification';
import { useAuth } from '../context/AuthContext';
import { resolveApiBase } from '../utils/resolveApiBase';

const Login = () => {
  const navigate = useNavigate();
  const { login, completeSession } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials', 'otp'

  const validatePhoneNumber = (phone) => {
    // Tanzanian phone number format
    const phoneRegex = /^(\+255|255|0)?[67][5-9]\d{7}$/;
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
      setError('Invalid phone number format. Use format like: 07XX XXX XXX or +255 7XX XXX XXX');
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

      const response = await fetch(`${API_URL}/otp/request-login`, {
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
        setError('Two-factor authentication required. Use OTP login or verify 2FA.');
        return;
      }

      if (data?.success !== false && data?.token) {
        toast.success('Login successful!');
        navigate('/chat', { replace: true });
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

  const handleOTPOrLogin = (e) => {
    // If user wants to use OTP method
    handleRequestOTP(e);
  };

  const handleOTPComplete = (token, user) => {
    if (token && user) {
      completeSession({ token, user });
      navigate('/chat', { replace: true });
    } else {
      // Go back to credentials
      setStep('credentials');
      setShowOTP(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setShowOTP(false);
    localStorage.removeItem('tempPassword');
  };

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
          <p className="text-sm text-slate-400 mt-1">Ingia kwenye akaunti yako kuendelea.</p>
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
          {loading ? 'Inaingia...' : 'Login directly'}
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