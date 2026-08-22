import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Loader2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { useConfirm } from './ConfirmDialog';

const PasskeysSettings = () => {
  const confirm = useConfirm();
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');

  const API_URL = resolveApiBase();

  const fetchPasskeys = async () => {
    try {
      const res = await authFetch(`${API_URL}/auth/passkey/list`);
      const data = await res.json();
      if (data.success) {
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Fetch passkeys error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      const optionsRes = await authFetch(`${API_URL}/auth/passkey/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: deviceName.trim() })
      });
      const optionsData = await optionsRes.json();

      if (!optionsData.success) {
        throw new Error(optionsData.message || 'Failed to get registration options');
      }

      const publicKeyCredential = await navigator.credentials.create({
        publicKey: {
          ...optionsData.options,
          challenge: Uint8Array.from(atob(optionsData.options.challenge), c => c.charCodeAt(0)),
          user: {
            ...optionsData.options.user,
            id: Uint8Array.from(atob(optionsData.options.user.id), c => c.charCodeAt(0))
          },
          excludeCredentials: optionsData.options.excludeCredentials?.map(c => ({
            ...c,
            id: Uint8Array.from(atob(c.id), c => c.charCodeAt(0))
          })) || []
        }
      });

      const response = {
        id: publicKeyCredential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))),
        type: publicKeyCredential.type,
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.response.clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.response.attestationObject)))
        }
      };

      const verifyRes = await authFetch(`${API_URL}/auth/passkey/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, deviceName: deviceName.trim() })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        setSuccess('Passkey registered successfully!');
        setDeviceName('');
        setShowRegisterModal(false);
        fetchPasskeys();
      } else {
        throw new Error(verifyData.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Register passkey error:', err);
      setError(err.message || 'Failed to register passkey. Make sure you have a compatible device.');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (passkeyId) => {
    if (!(await confirm('Are you sure you want to delete this passkey?'))) return;

    try {
      const res = await authFetch(`${API_URL}/auth/passkey/${passkeyId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Passkey deleted successfully');
        fetchPasskeys();
      } else {
        setError(data.message || 'Failed to delete passkey');
      }
    } catch (err) {
      console.error('Delete passkey error:', err);
      setError('Failed to delete passkey');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#00a884] animate-spin" />
      </div>
    );
  }

  // Check actual WebAuthn capability, not just object existence.
  // On Android WebView (Capacitor), PublicKeyCredential may exist but the
  // underlying FIDO2/Credential Manager plugin may not be connected.
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [webauthnNote, setWebauthnNote] = useState('');

  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential === undefined) {
        setIsPasskeySupported(false);
        return;
      }
      try {
        // Try the most reliable capability check first
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsPasskeySupported(available);
          if (!available) {
            setWebauthnNote('Your device does not have a platform authenticator (fingerprint/face/PIN) available for passkeys.');
          }
        } else {
          // Fallback: assume supported if the API exists
          setIsPasskeySupported(true);
        }
      } catch {
        setIsPasskeySupported(false);
      }
    };
    checkSupport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-10 h-10 text-[#00a884] bg-[#00a884]/10 rounded-xl flex items-center justify-center" />
        <div>
          <h2 className="text-xl font-semibold text-white">Passkeys</h2>
          <p className="text-gray-400 text-sm">Passwordless login with biometrics or device PIN</p>
        </div>
      </div>

      {!isPasskeySupported && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium">Passkeys not supported</p>
            <p className="text-yellow-400/80 text-sm">{webauthnNote || "Your browser or device doesn't support WebAuthn passkeys. Update your browser or use a compatible device."}</p>
          </div>
        </div>
      )}

      {isPasskeySupported && window.Capacitor?.isNativePlatform?.() && (
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-blue-300 font-medium">Using app version</p>
            <p className="text-blue-400/80 text-sm">Passkeys may not work fully in the app version. For the best experience, use GENZ Messenger in a web browser.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3 text-green-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="bg-[#1a2e35] rounded-2xl border border-[#00a884]/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold">Your Passkeys</h3>
          {isPasskeySupported && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#00a884]/90 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Passkey
            </button>
          )}
        </div>

        {passkeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No passkeys registered</p>
            <p className="text-gray-500 text-sm mb-6">Add a passkey to sign in securely without a password using your fingerprint, face, or device PIN.</p>
            {isPasskeySupported && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-6 py-3 bg-[#00a884] text-white rounded-lg hover:bg-[#00a884]/90 transition-colors"
              >
                Add Your First Passkey
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div key={passkey._id} className="flex items-center justify-between p-4 bg-[#0b141a] rounded-xl border border-[#00a884]/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00a884]/10 rounded-xl flex items-center justify-center">
                    <Key className="w-6 h-6 text-[#00a884]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{passkey.deviceName || 'Unknown Device'}</p>
                    <p className="text-gray-400 text-sm">
                      Added {formatDate(passkey.createdAt)}
                      {passkey.deviceType === 'platform' && <span className="ml-2 text-xs text-[#00a884]">(Platform)</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(passkey._id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete passkey"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1a2e35] rounded-2xl border border-[#00a884]/20 p-6">
        <h3 className="text-white font-semibold mb-4">How Passkeys Work</h3>
        <div className="space-y-3 text-gray-300 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#00a884] text-xs font-bold">1</span>
            </div>
            <p>Passkeys use your device's biometric authentication (fingerprint, Face ID, Windows Hello) or PIN</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#00a884] text-xs font-bold">2</span>
            </div>
            <p>No passwords to remember or type — just authenticate with your device</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#00a884] text-xs font-bold">3</span>
            </div>
            <p>Phishing-resistant — passkeys only work on the legitimate Genz Messages domain</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#00a884] text-xs font-bold">4</span>
            </div>
            <p>Synced across your devices via iCloud Keychain, Google Password Manager, or Windows Hello</p>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a2e35] rounded-2xl border border-[#00a884]/20 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Register New Passkey</h3>
              <button onClick={() => { setShowRegisterModal(false); setError(''); }} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-6">Enter a name for this device (e.g., "iPhone 15", "Windows Laptop", "YubiKey")</p>

            <div className="mb-6">
              <label className="block text-sm text-gray-300 mb-2">Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My iPhone"
                className="w-full bg-[#0b141a] border border-[#00a884]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#00a884] focus:outline-none"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-600/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRegisterModal(false); setDeviceName(''); setError(''); }}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={registering || !deviceName.trim()}
                className="flex-1 px-4 py-3 bg-[#00a884] text-white rounded-lg hover:bg-[#00a884]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </span>
                ) : (
                  'Register Passkey'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasskeysSettings;