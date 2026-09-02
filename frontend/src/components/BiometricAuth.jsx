import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fingerprint, 
  X, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Shield
} from 'lucide-react';

const BiometricAuth = ({ onSuccess, onCancel }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = () => {
    // Check if WebAuthn is supported
    const supported = 
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function' &&
      typeof window.PublicKeyCredential.getUserMedia === 'function' ||
      navigator.credentials !== undefined;
    
    setIsSupported(supported);
    
    if (!supported) {
      setError('Biometric authentication is not supported on this device');
    }
  };

  const authenticateWithBiometric = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // In a real implementation, you would:
      // 1. Get a challenge from your server
      // 2. Call navigator.credentials.get() with the challenge
      // 3. Send the response to your server for verification
      
      // For demo purposes, we'll simulate the authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful authentication
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Biometric authentication error:', err);
      setError('Authentication failed. Please try again or use your password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const registerBiometric = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // In a real implementation, you would:
      // 1. Get registration options from your server
      // 2. Call navigator.credentials.create() with the options
      // 3. Send the response to your server for registration
      
      // For demo purposes, we'll simulate registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Biometric registration error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Biometric Authentication</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isSupported && (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">Biometric authentication not supported</p>
              <p className="text-sm text-gray-400">Your device doesn't support fingerprint or face ID authentication</p>
            </div>
          )}

          {isSupported && !success && (
            <div className="space-y-6">
              {/* Fingerprint Icon Animation */}
              <div className="flex justify-center">
                <motion.div
                  animate={isAuthenticating ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: isAuthenticating ? Infinity : 0 }}
                  className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                  ) : (
                    <Fingerprint className="w-12 h-12 text-blue-600" />
                  )}
                </motion.div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <p className="text-gray-800 font-medium">
                  {isAuthenticating ? 'Authenticating...' : 'Touch the fingerprint sensor'}
                </p>
                <p className="text-sm text-gray-500">
                  Use your fingerprint or face ID to sign in
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </motion.div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={authenticateWithBiometric}
                  disabled={isAuthenticating}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Authenticate
                    </>
                  )}
                </button>
                
                <button
                  onClick={registerBiometric}
                  disabled={isAuthenticating}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register New Biometric
                </button>
              </div>
            </div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-gray-800 font-medium mb-2">Authentication Successful</p>
              <p className="text-sm text-gray-500">You have been securely authenticated</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BiometricAuth;
