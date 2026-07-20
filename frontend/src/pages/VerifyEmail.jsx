import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import securityService from '../services/securityService';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    } else {
      setLoading(false);
      setError('No verification token provided. Please check your email for the verification link.');
    }
  }, [token]);

  const verifyEmailToken = async () => {
    try {
      setVerifying(true);
      const response = await securityService.verifyEmail(token);
      setEmail(response.email || '');
      setSuccess(true);
    } catch (error) {
      console.error('Error verifying email:', error);
      setError(error.message || 'Invalid or expired verification token');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setResendLoading(true);
      await securityService.resendEmailVerification(email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error('Error resending verification:', error);
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verifying Email</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we verify your email address...
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full"
        >
          <div className="text-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Verified!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your email address has been successfully verified. Your account is now more secure.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue to Login
              </button>
              <button
                onClick={() => navigate('/settings/security')}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Go to Security Settings
              </button>
            </div>

            <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Security Tip:</strong> Keep your email address up to date to ensure you can always recover your account.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full"
      >
        {/* Error Icon */}
        <div className="text-center mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full w-12 h-12 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error || 'We couldn\'t verify your email address'}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resend Verification */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Need a new verification email?</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <button
              onClick={handleResendVerification}
              disabled={resendLoading || !email}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Message for Resend */}
        <AnimatePresence>
          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-sm text-green-600 dark:text-green-400">
                Verification email sent! Check your inbox.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Information */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Troubleshooting:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure the email address is correct</li>
            <li>• Verification links expire after 24 hours</li>
            <li>• Click the most recent verification email</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/login"
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors block text-center"
          >
            Back to Login
          </Link>
          <Link
            to="/settings/security"
            className="w-full px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium block text-center"
          >
            Security Settings
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
