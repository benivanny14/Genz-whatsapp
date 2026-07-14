import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

// FEATURE ADD: the backend already has a full admin bootstrap flow
// (POST /admin/bootstrap with an x-admin-bootstrap-token header — see
// backend/controllers/adminController.js) and a complete /admin panel, but
// there was no page anywhere in the app to actually use it. Anyone wanting
// to become the first admin had to know to call the raw API with a tool
// like curl/Postman. This page is that missing front door.
const AdminSetup = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/admin/bootstrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bootstrap-token': token.trim()
        },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setSuccess(true);
        setTimeout(() => navigate('/admin'), 1200);
      } else {
        setError(data.message || 'Bootstrap token si sahihi, au admin tayari yupo.');
      }
    } catch (err) {
      setError('Imeshindwa kuunganisha na server. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-4"
        >
          <ArrowLeft size={16} /> Rudi nyuma
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-[#25d366]/15 text-[#25d366]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Kuwa Admin (Mara ya Kwanza Tu)</h1>
            <p className="text-white/45 text-xs">One-time admin bootstrap</p>
          </div>
        </div>

        <p className="text-white/60 text-sm mt-3 mb-5 leading-relaxed">
          Weka <strong>ADMIN_BOOTSTRAP_TOKEN</strong> uliyoiweka kwenye faili la <code className="bg-white/10 px-1 rounded">.env</code>
          {' '}la backend yako. Ukishakuwa admin mara moja, ukurasa huu utafungwa moja kwa moja kwa watumiaji wengine.
        </p>

        {success ? (
          <div className="bg-green-500/15 border border-green-500/30 text-green-300 rounded-lg p-4 text-sm text-center">
            ✅ Umefanikiwa kuwa Admin! Unaelekezwa kwenye Admin Panel...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ADMIN_BOOTSTRAP_TOKEN"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-3 text-sm text-white outline-none focus:border-[#25d366]/60"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-300 rounded-lg p-3 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full bg-[#25d366] hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg py-3 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? 'Inathibitisha...' : 'Kuwa Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminSetup;
