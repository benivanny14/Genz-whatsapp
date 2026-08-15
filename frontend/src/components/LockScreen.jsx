import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { isBiometricAvailable, authenticateWithBiometric } from '../services/capacitorBridge';

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

const LockScreen = ({ onUnlock, correctPin, lockType = 'pin' }) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPin, setShowPin] = useState(false);
  // Fingerprint mode: show the native prompt first; fall back to PIN on the
  // web (no biometric hardware) or after a failed/cancelled scan.
  const [usePinFallback, setUsePinFallback] = useState(lockType !== 'fingerprint');
  const [biometricChecking, setBiometricChecking] = useState(lockType === 'fingerprint');
  const hasPinBackup = !!localStorage.getItem('genz_lock_pin') || !!localStorage.getItem('genz_pin_hash');

  // When the app lock is fingerprint-based, run the native OS biometric prompt
  // automatically as soon as the lock screen appears (APK only).
  useEffect(() => {
    if (lockType !== 'fingerprint') return;
    let cancelled = false;
    setBiometricChecking(true);
    (async () => {
      const { native, isAvailable } = await isBiometricAvailable();
      if (cancelled) return;
      if (native && isAvailable) {
        const result = await authenticateWithBiometric({
          reason: 'Unlock Genz Messenger',
          description: 'Scan your fingerprint to open the app.'
        });
        if (cancelled) return;
        setBiometricChecking(false);
        if (result.verified === true) {
          localStorage.setItem('genz_last_unlock', Date.now().toString());
          onUnlock();
        } else {
          setUsePinFallback(true);
        }
      } else {
        setBiometricChecking(false);
        // No biometrics (e.g. web). If there is no PIN backup configured the
        // lock has nothing protecting it — unlock rather than trap the user.
        if (!hasPinBackup) {
          localStorage.setItem('genz_last_unlock', Date.now().toString());
          onUnlock();
        } else {
          setUsePinFallback(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [lockType, onUnlock]);

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

  const runBiometricPrompt = async () => {
    setError('');
    setBiometricChecking(true);
    const result = await authenticateWithBiometric({
      reason: 'Unlock Genz Messenger',
      description: 'Scan your fingerprint to open the app.'
    });
    setBiometricChecking(false);
    if (result.verified === true) {
      localStorage.setItem('genz_last_unlock', Date.now().toString());
      onUnlock();
    } else {
      setError('Biometric authentication failed. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center flex-col p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2440 50%, #0a1628 100%)' }}
    >
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 flex flex-col items-center gap-6 shadow-2xl">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
          {lockType === 'fingerprint' ? <Fingerprint size={40} className="text-blue-400" /> : <Shield size={40} className="text-blue-400" />}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">Genz Messenger</h2>
          {lockType === 'fingerprint' && !usePinFallback ? (
            <p className="text-sm text-blue-300/70">
              {biometricChecking ? 'Checking fingerprint...' : 'Unlock with your fingerprint'}
            </p>
          ) : (
            <p className="text-sm text-blue-300/70">Enter your PIN to unlock</p>
          )}
        </div>

        {/* Fingerprint mode: native prompt + retry / PIN fallback */}
        {lockType === 'fingerprint' && !usePinFallback && (
          <>
            <button
              onClick={runBiometricPrompt}
              disabled={biometricChecking}
              className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center hover:bg-blue-600/30 transition-colors disabled:opacity-50"
              aria-label="Unlock with fingerprint"
            >
              {biometricChecking ? (
                <Fingerprint size={48} className="text-blue-400 animate-pulse" />
              ) : (
                <Fingerprint size={48} className="text-blue-400" />
              )}
            </button>
            {hasPinBackup ? (
              <button
                onClick={() => setUsePinFallback(true)}
                className="text-sm text-blue-300/60 hover:text-blue-300 underline underline-offset-2"
              >
                Use PIN instead
              </button>
            ) : (
              <p className="text-xs text-blue-300/50">No PIN backup configured</p>
            )}
          </>
        )}

        {/* PIN dots display (PIN mode or fallback) */}
        {usePinFallback && (
        <div className="flex gap-4">
          {pinDots}
        </div>
        )}

        <div className="relative w-full max-w-[200px]">
          <input
            type={showPin ? 'text' : 'password'}
            maxLength="4"
            value={enteredPin}
            onChange={handlePinChange}
            disabled={locked}
            className={`w-full text-center bg-white/10 border border-white/20 rounded-xl p-3 text-white text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-500 placeholder-white/20 disabled:opacity-50 ${usePinFallback ? '' : 'hidden'}`}
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
