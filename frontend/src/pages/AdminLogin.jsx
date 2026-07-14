import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, KeyRound, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const { loginStep1, verifyTwoFactor } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = location.state?.from?.pathname || '/system-control-x7k9';

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await loginStep1(username, password);
      if (result.requiresTwoFactor) {
        setStep(2);
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyTwoFactor(code);
      toast.success('Karibu Admin');
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

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
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
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1">
                <KeyRound size={14} /> 6-digit authenticator code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 tracking-[0.5em] text-center text-lg outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
              Verify
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
