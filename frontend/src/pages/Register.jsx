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
    password: '',
    confirmPassword: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (() => {
    const p = form.password || '';
    const checks = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /\d/.test(p),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { score, checks };
  })();

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleDirectRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);

    try {
      const data = await register({ phoneNumber: form.phoneNumber, username: form.username, password: form.password });

      console.log('[Register] Registration response:', data);

      if (data?.requiresPhoneVerification) {
        navigate('/verify-phone', { replace: true });
        return;
      }

      if (data?.success !== false && data?.token) {
        // Force a page reload to ensure session is properly initialized
        window.location.href = '/chat';
      } else {
        setError(data?.message || 'Registration failed');
      }
    } catch (err) {
      setError(err?.message || 'Network error. Please check your connection.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(900px 600px at 20% 15%, rgba(255,45,120,0.22), transparent 55%), radial-gradient(800px 600px at 85% 85%, rgba(124,92,255,0.22), transparent 55%), radial-gradient(700px 500px at 65% 30%, rgba(0,217,166,0.12), transparent 50%), #0c0a1e' }}>
      <form onSubmit={handleDirectRegister} className="w-full max-w-md bg-[#111b21] border border-white/10 rounded-lg p-6 shadow-2xl genz-card">
        <div className="mb-6">
          <h1 className="genz-display text-2xl text-white">Tengeneza Akaunti</h1>
          <p className="text-sm text-slate-400 mt-1">Jisajili kwa akaunti mpya ya GENZ WhatsApp.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <p>{error}</p>
            {(error.toLowerCase().includes('already') || error.toLowerCase().includes('exists') || error.toLowerCase().includes('registered')) && (
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
            minLength={8}
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-300">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="-mt-4 mb-5 text-xs text-slate-500">
          Minimum 8 characters: uppercase, lowercase, number, and special character.
        </p>

        {/* Password strength indicator */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded bg-slate-700 overflow-hidden">
              <div className={`h-full rounded transition-all ${passwordStrength.score >= 4 ? 'bg-green-400' : passwordStrength.score >= 2 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-400 min-w-[48px] text-right">
              {passwordStrength.score === 5 ? 'Strong' : passwordStrength.score >= 2 ? 'Medium' : form.password ? 'Weak' : '—'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
            <span className={passwordStrength.checks.length ? 'text-green-400' : ''}>8+ chars</span>
            <span className={passwordStrength.checks.upper ? 'text-green-400' : ''}>Uppercase</span>
            <span className={passwordStrength.checks.number ? 'text-green-400' : ''}>Number</span>
            <span className={passwordStrength.checks.special ? 'text-green-400' : ''}>Special</span>
          </div>
        </div>

        <label className="block text-sm text-slate-300 mb-2">Thibitisha Nenosiri</label>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#202c33] border border-white/10 px-3">
          <Lock size={18} className="text-slate-400" />
          <input
            type={showConfirm ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            className="w-full bg-transparent py-3 text-white outline-none"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button type="button" onClick={() => setShowConfirm((value) => !value)} className="text-slate-300">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="text-xs text-red-400 mb-2">Passwords do not match</p>
        )}

        {/* Terms checkbox */}
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 rounded border-slate-600 text-[#ff2d78] focus:ring-[#ff2d78]"
            required
          />
          <span className="text-xs text-slate-300">
            I agree to the <span className="text-[#00a884]">Terms of Service</span> and <span className="text-[#00a884]">Privacy Policy</span>, including encryption and privacy settings.
          </span>
        </label>
        {!agreedToTerms && error && (
          <p className="text-xs text-red-400 mb-2">You must accept the terms to continue</p>
        )}

        <button
          type="submit"
          disabled={loading || passwordStrength.score < 3 || form.password !== form.confirmPassword || !agreedToTerms}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#ff2d78] hover:bg-[#d61a5e] py-3 font-bold text-white transition-colors disabled:opacity-60 genz-sticker"
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