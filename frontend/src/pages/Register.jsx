import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
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
    setError('');
  };

  const handleDirectRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
      <form onSubmit={handleDirectRegister} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#00a884] hover:bg-[#008f6f] py-3 font-semibold text-[#0b141a] transition-colors disabled:opacity-60"
        >
          <UserPlus size={18} />
          {loading ? 'Inatengeneza...' : 'Register'}
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