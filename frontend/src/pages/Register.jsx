import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, UserPlus, Smartphone } from 'lucide-react';
import OTPVerification from '../components/OTPVerification';
import { useAuth } from '../context/AuthContext';
import { resolveApiBase } from '../utils/resolveApiBase';

const Register = () => {
  const navigate = useNavigate();
  const { register, completeSession } = useAuth();
  const [form, setForm] = useState({
    phoneNumber: '',
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [step, setStep] = useState('register'); // 'register', 'otp'

  const validatePhoneNumber = (phone) => {
    // Tanzanian phone number format
    const phoneRegex = /^(\+255|255|0)?[67][5-9]\d{7}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const validatePassword = (password) => {
    // At least 6 characters
    return password.length >= 6;
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!form.phoneNumber || !form.username || !form.password) {
      setError('All fields are required');
      return;
    }

    if (!validatePhoneNumber(form.phoneNumber)) {
      setError('Invalid phone number format. Use format like: 07XX XXX XXX or +255 7XX XXX XXX');
      return;
    }

    if (!validatePassword(form.password)) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setLoading(true);

    try {
      const API_URL = resolveApiBase();
      
      // Store data temporarily for OTP verification
      localStorage.setItem('tempUsername', form.username);
      localStorage.setItem('tempPassword', form.password);

      const response = await fetch(`${API_URL}/otp/request-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: form.phoneNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('otp');
        setShowOTP(true);
        // Don't show toast here, OTP component will handle feedback
      } else {
        setError(data.message || 'Failed to send OTP');
        localStorage.removeItem('tempUsername');
        localStorage.removeItem('tempPassword');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Registration error:', err);
      localStorage.removeItem('tempUsername');
      localStorage.removeItem('tempPassword');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = resolveApiBase();
      
      const data = await register(form);

      if (data?.success !== false && data?.token) {
        navigate('/chat', { replace: true });
      } else {
        setError(data?.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = (token, user) => {
    if (token && user) {
      completeSession({ token, user });
      navigate('/chat', { replace: true });
    } else {
      // Go back to register
      setStep('register');
      setShowOTP(false);
    }
  };

  const handleBackToRegister = () => {
    setStep('register');
    setShowOTP(false);
    localStorage.removeItem('tempUsername');
    localStorage.removeItem('tempPassword');
  };

  if (showOTP) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
          <OTPVerification
            phoneNumber={form.phoneNumber}
            type="register"
            onComplete={handleOTPComplete}
          />
          <div className="mt-4 text-center">
            <button
              onClick={handleBackToRegister}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleRequestOTP} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Tengeneza Akaunti</h1>
          <p className="text-sm text-slate-400 mt-1">Jisajili kwa akaunti mpya ya GENZ WhatsApp.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <p>{error}</p>
            {(error.includes('already exists') || error.includes('account with this')) && (
              <Link to="/login" className="mt-2 block text-[#00a884] hover:underline">
                Already have an account? Log in →
              </Link>
            )}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-2">
          Namba ya simu (e.g. +255712345678)
        </label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Phone size={18} className="text-[#00a884]" />
          <input
            value={form.phoneNumber}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            placeholder="+255..."
            autoComplete="tel"
            required
          />
        </div>

        <label className="block text-sm text-slate-300 mb-2">
          Jina lako / Username
        </label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <UserPlus size={18} className="text-slate-400" />
          <input
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            placeholder="John Doe"
            autoComplete="username"
            required
          />
        </div>

        <label className="block text-sm text-slate-300 mb-2">Nenosiri</label>
        <div className="mb-6 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Lock size={18} className="text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-300">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Register with OTP Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60 mb-3"
        >
          <Smartphone size={18} />
          {loading ? 'Inatuma OTP...' : 'Register with OTP'}
        </button>

        <div className="relative flex items-center justify-center mb-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#111b21] px-3 text-xs text-slate-400 uppercase">Au</span>
        </div>

        {/* Direct Register Button (without OTP) */}
        <button
          type="button"
          onClick={handleDirectRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-transparent border border-white/20 hover:bg-white/5 py-3 font-semibold text-white transition-colors disabled:opacity-50"
        >
          <UserPlus size={18} />
          {loading ? 'Inatengeneza...' : 'Register directly'}
        </button>

        <div className="relative flex items-center justify-center mb-3 mt-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#111b21] px-3 text-xs text-slate-400 uppercase">Au</span>
        </div>

        <button
          type="button"
          onClick={() => {
            import('react-hot-toast').then(({ default: toast }) => {
              toast('Sign up with Email is Coming Soon!', {
                icon: '🚀',
                style: { background: '#333', color: '#fff' }
              });
            });
          }}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-transparent border border-white/20 hover:bg-white/5 py-3 font-semibold text-white transition-colors"
        >
          <Mail size={18} />
          Sign up with Email
        </button>

        <p className="mt-5 text-center text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="text-[#00a884] hover:text-white transition-colors">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;