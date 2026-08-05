import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

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
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ identifier: phoneNumber, password });

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

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleCredentialsLogin} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60"
        >
          <LogIn size={18} />
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/register" className="text-slate-300 hover:text-white transition-colors">Create account</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;