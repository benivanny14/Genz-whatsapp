import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Loader2, KeyRound } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminLogin = () => {
  const { loginStep1, verifyTwoFactor, isAuthenticated, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = location.state?.from?.pathname || '/system-control-x7k9';

  // Redirect authenticated admins to the dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await loginStep1(username, password);
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyTwoFactor(twoFactorCode);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid authentication code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center mb-3">
            <Shield className="text-emerald-500" size={28} />
          </div>
          <h1 className="text-white text-xl font-semibold">System Control</h1>
          <p className="text-gray-500 text-sm mt-1">Owner access only</p>
        </div>

        {!requiresTwoFactor ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Two-Factor Authentication Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                autoFocus
                maxLength={6}
                placeholder="000000"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-center tracking-widest outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-gray-500 text-xs mt-2">Enter the 6-digit code from your authenticator app.</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={() => { setRequiresTwoFactor(false); setTwoFactorCode(''); setError(''); }}
              className="w-full text-gray-400 hover:text-white text-sm py-1"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
