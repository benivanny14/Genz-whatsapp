import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Eye, EyeOff } from 'lucide-react';

// ── Secure PIN hashing (no external lib needed) ──
const hashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'genz_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const saveSecurePin = async (pin) => {
  const hash = await hashPin(pin);
  localStorage.setItem('genz_pin_hash', hash);
  localStorage.setItem('genz_lock_type', 'pin');
};

export const verifySecurePin = async (pin) => {
  const storedHash = localStorage.getItem('genz_pin_hash');
  if (!storedHash) return pin === (localStorage.getItem('genz_lock_pin') || '');
  const hash = await hashPin(pin);
  return hash === storedHash;
};

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const LockScreen = ({ onUnlock, correctPin }) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPin, setShowPin] = useState(false);

  // Lockout after 5 failed attempts
  useEffect(() => {
    if (attempts >= 5) {
      setLocked(true);
      setCountdown(30);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(interval); setLocked(false); setAttempts(0); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempts]);

  const handlePinChange = async (e) => {
    if (locked) return;
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setEnteredPin(value);
      setError('');
      if (value.length === 4) {
        const isValid = await verifySecurePin(value);
        if (isValid) {
          localStorage.setItem('genz_last_unlock', Date.now().toString());
          onUnlock();
        } else {
          setAttempts(prev => prev + 1);
          setError(attempts >= 4 ? 'Too many attempts. Locked for 30s.' : `Wrong PIN. ${4 - attempts} attempts left.`);
          setEnteredPin('');
        }
      }
    }
  };

  const pinDots = [0, 1, 2, 3].map(i => (
    <div
      key={i}
      className={`w-4 h-4 rounded-full border-2 transition-all ${
        i < enteredPin.length
          ? 'bg-blue-500 border-blue-500 scale-110'
          : 'border-white/30'
      }`}
    />
  ));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center flex-col p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2440 50%, #0a1628 100%)' }}
    >
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 flex flex-col items-center gap-6 shadow-2xl">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
          <Shield size={40} className="text-blue-400" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">GENZ WhatsApp</h2>
          <p className="text-sm text-blue-300/70">Enter your PIN to unlock</p>
        </div>

        {/* PIN dots display */}
        <div className="flex gap-4">
          {pinDots}
        </div>

        <div className="relative w-full max-w-[200px]">
          <input
            type={showPin ? 'text' : 'password'}
            maxLength="4"
            value={enteredPin}
            onChange={handlePinChange}
            disabled={locked}
            className="w-full text-center bg-white/10 border border-white/20 rounded-xl p-3 text-white text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-500 placeholder-white/20 disabled:opacity-50"
            placeholder="••••"
            autoFocus
          />
          <button
            onClick={() => setShowPin(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
          >
            {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium">{error}</p>
        )}

        {locked && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 text-sm font-bold">Too many attempts</p>
            <p className="text-red-300/70 text-xs mt-1">Try again in <span className="font-bold">{countdown}s</span></p>
          </div>
        )}

        <p className="text-white/30 text-xs text-center">
          🔒 Secured with SHA-256 PIN encryption
        </p>
      </div>
    </div>
  );
};

// ── Inactivity auto-lock hook ──
export const useInactivityLock = (enabled, onLock) => {
  const reset = useCallback(() => {
    localStorage.setItem('genz_last_activity', Date.now().toString());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));

    const checker = setInterval(() => {
      const last = parseInt(localStorage.getItem('genz_last_activity') || Date.now().toString());
      if (Date.now() - last > INACTIVITY_TIMEOUT) onLock();
    }, 30000);

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearInterval(checker);
    };
  }, [enabled, onLock, reset]);
};

export default LockScreen;
