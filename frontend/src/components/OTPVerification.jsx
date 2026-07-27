import { useState, useEffect, useRef } from 'react';
import { resolveApiBase, fetchWithTimeout } from '../utils/resolveApiBase';

// FIX: fetch() calls in this component always hard-coded a
// 'http://localhost:5000/api' fallback whenever VITE_API_URL wasn't baked
// into the production build. On a real phone, "localhost" means the phone
// itself, not the server — so on any deployment that relies on the
// relative-path fallback (single-service deploy, backend serving the
// frontend), every request from this screen tried to reach a server that
// doesn't exist on the device, and — with no fetch timeout either — the
// request never resolved. That left OTP verification (the default "Login
// with OTP" flow) stuck on a loading spinner forever, specifically at the
// step where the person enters the system. Use the same origin-aware
// resolver as the rest of the app instead, plus a timeout so the request
// always settles.
const OTP_API_URL = resolveApiBase();

const OTPVerification = ({ phoneNumber, onComplete, onResend, type = 'register' }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [pendingOtpCode, setPendingOtpCode] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Resend timer countdown
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = (element, index) => {
    // Only allow numbers
    const value = element.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value[value.length - 1];
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Check if OTP is complete
    if (index === 5 && newOtp.every(digit => digit !== '')) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      
      // Focus last input
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
      
      // Auto-verify
      verifyOTP(newOtp.join(''));
    }
  };

  const verifyOTP = async (otpCode, extra = {}) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = type === 'register' ? '/otp/verify-register' : '/otp/verify-login';
      
      const requestBody = type === 'register' 
        ? { phoneNumber, otp: otpCode, username: localStorage.getItem('tempUsername'), password: localStorage.getItem('tempPassword') }
        : { phoneNumber, otp: otpCode, password: localStorage.getItem('tempPassword'), ...extra };

      const response = await fetchWithTimeout(`${OTP_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // BUG FIX: the backend could ask for a 2FA code (requiresTwoFactor)
      // after the phone OTP was accepted, but this component had no way to
      // collect one — login with 2FA enabled was a dead end here. Keep the
      // OTP code (it isn't consumed server-side until 2FA also passes) and
      // show a 2FA input instead of failing silently.
      if (response.ok && data.success && data.requiresTwoFactor) {
        setPendingOtpCode(otpCode);
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      if (response.ok && data.success && data.token) {
        setSuccess('Verification successful!');
        // Clear temporary data
        localStorage.removeItem('tempUsername');
        localStorage.removeItem('tempPassword');
        // Call onComplete with token and user data
        if (onComplete) {
          onComplete(data.token, data.user);
        }
      } else if (!data.requiresTwoFactor) {
        setError(data.message || 'Invalid OTP. Please try again.');
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        setRequiresTwoFactor(false);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (err) {
      setError(err.name === 'AbortError'
        ? 'Muda wa muunganisho umeisha. Angalia mtandao wako na ujaribu tena.'
        : 'Network error. Please try again.');
      console.error('OTP verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(twoFactorToken.trim())) {
      setError('Weka namba 6 za app yako ya 2FA.');
      return;
    }
    verifyOTP(pendingOtpCode, { twoFactorToken: twoFactorToken.trim() });
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout(`${OTP_API_URL}/otp/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, type }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('New OTP sent successfully!');
        setResendTimer(30);
        setCanResend(false);
        if (onResend) onResend();
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.name === 'AbortError'
        ? 'Muda wa muunganisho umeisha. Angalia mtandao wako na ujaribu tena.'
        : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    // Clear temporary data
    localStorage.removeItem('tempUsername');
    localStorage.removeItem('tempPassword');
    // Call onComplete with null to go back
    if (onComplete) onComplete(null, null);
  };

  if (requiresTwoFactor) {
    return (
      <form onSubmit={handleTwoFactorSubmit} className="flex flex-col items-center justify-center p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Uthibitisho wa hatua mbili (2FA)</h2>
          <p className="text-gray-400">
            Weka namba 6 zinazoonekana kwenye app yako ya uthibitisho (mfano Google Authenticator).
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={twoFactorToken}
          onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={loading}
          autoFocus
          placeholder="000000"
          className="w-40 h-14 text-center text-2xl tracking-[0.4em] font-bold bg-gray-800 border-2 border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none transition-colors"
        />

        {error && (
          <div className="text-red-500 text-sm text-center bg-red-500/10 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Inathibitisha...' : 'Thibitisha na ingia'}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {type === 'register' ? 'Verify Your Account' : 'Verify Login'}
        </h2>
        <p className="text-gray-400">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-white">{phoneNumber}</span>
        </p>
        <button
          onClick={handleChangePhone}
          className="text-sm text-green-500 hover:text-green-400 mt-1"
        >
          Change phone number
        </button>
      </div>

      {/* OTP Input Fields */}
      <div className="flex gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            disabled={loading}
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-800 border-2 border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none transition-colors"
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-sm text-center bg-red-500/10 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="text-green-500 text-sm text-center bg-green-500/10 px-4 py-2 rounded-lg">
          {success}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying...</span>
        </div>
      )}

      {/* Resend OTP */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Didn't receive the code?{' '}
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-green-500 hover:text-green-400 font-semibold disabled:opacity-50"
            >
              Resend OTP
            </button>
          ) : (
            <span className="text-gray-500">Resend in {resendTimer}s</span>
          )}
        </p>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-sm">
        <p>💡 Tip: You can also paste the entire OTP code</p>
        <p>The code expires in 5 minutes</p>
      </div>
    </div>
  );
};

export default OTPVerification;