import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, UserPlus } from 'lucide-react';
import authService from '../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phoneNumber: '',
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return; // Prevent double submission

    setError('');
    setLoading(true);

    try {
      await authService.register(form);
      navigate('/chat', { replace: true });
      window.location.reload();
    } catch (err) {
      // Handle specific error statuses with user-friendly messages
      if (err.status === 409) {
        // User already exists - show backend message and login link
        setError(err.message || 'An account with this email, username, or phone number already exists.');
      } else if (err.status === 400) {
        setError(err.message || 'Please check your input and try again.');
      } else if (err.status === 429) {
        setError('Too many registration attempts. Please try again later.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Create GENZ Account</h1>
          <p className="text-sm text-slate-400 mt-1">Tengeneza account salama kwa chat zako.</p>
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

        <label className="block text-sm text-slate-300 mb-2">Phone number (e.g. +255712345678)</label>
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

        <label className="block text-sm text-slate-300 mb-2">Your Name / Username</label>
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

        <label className="block text-sm text-slate-300 mb-2">Password</label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Lock size={18} className="text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-300">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60 mb-3"
        >
          <UserPlus size={18} />
          {loading ? 'Inatengeneza...' : 'Register'}
        </button>

        <div className="relative flex items-center justify-center mb-3">
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
          Already have an account? <Link to="/login" className="text-[#00a884] hover:text-white transition-colors">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
