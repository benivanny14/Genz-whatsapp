import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return; // Prevent double submission

    setError('');
    setLoading(true);

    try {
      const data = await authService.login({
        identifier,
        password,
        ...(twoFactorToken ? { twoFactorToken } : {})
      });

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        return;
      }

      navigate('/chat', { replace: true });
      window.location.reload();
    } catch (err) {
      // Handle specific error statuses with user-friendly messages
      if (err.status === 401) {
        setError('Invalid email, username, phone number, or password. Please try again.');
        setPassword(''); // Clear password on failed login (security best practice)
      } else if (err.status === 403) {
        setError('This account has been blocked. Please contact support.');
        setPassword(''); // Clear password on failed login
      } else if (err.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLoginClick = () => {
    toast('Login with Email is Coming Soon!', {
      icon: '🚀',
      style: { background: '#333', color: '#fff' }
    });
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">GENZ Login</h1>
          <p className="text-sm text-slate-400 mt-1">Ingia kwenye akaunti yako kuendelea.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-2">Phone number (e.g. +255...)</label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Phone size={18} className="text-[#00a884]" />
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            placeholder="+255712345678"
            autoComplete="tel"
            required
          />
        </div>

        <label className="block text-sm text-slate-300 mb-2">Password</label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
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

        {requiresTwoFactor && (
          <>
            <label className="block text-sm text-slate-300 mb-2">2FA code</label>
            <input
              value={twoFactorToken}
              onChange={(event) => setTwoFactorToken(event.target.value)}
              className="mb-4 w-full rounded-md bg-[#202c33] border border-white/10 px-3 py-3 text-white outline-none"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60 mb-3"
        >
          <LogIn size={18} />
          {loading ? 'Inaingia...' : 'Login'}
        </button>

        <div className="relative flex items-center justify-center mb-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#111b21] px-3 text-xs text-slate-400 uppercase">Au</span>
        </div>

        <button
          type="button"
          onClick={handleEmailLoginClick}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-transparent border border-white/20 hover:bg-white/5 py-3 font-semibold text-white transition-colors"
        >
          <Mail size={18} />
          Login with Email
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
