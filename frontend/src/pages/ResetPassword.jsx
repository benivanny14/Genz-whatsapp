import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Lock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import securityService from '../services/securityService';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain uppercase, lowercase, and numbers';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await securityService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password. The token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    const levels = [
      { strength: 0, text: 'Very Weak', color: 'bg-red-500' },
      { strength: 1, text: 'Weak', color: 'bg-red-400' },
      { strength: 2, text: 'Fair', color: 'bg-yellow-500' },
      { strength: 3, text: 'Good', color: 'bg-blue-500' },
      { strength: 4, text: 'Strong', color: 'bg-green-500' },
      { strength: 5, text: 'Very Strong', color: 'bg-green-600' }
    ];

    return levels[Math.min(strength, 4)];
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full"
        >
          <div className="text-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full w-12 h-12 mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            
            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors block text-center"
              >
                Request New Reset Link
              </Link>
              <Link
                to="/login"
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors block text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            
            <Link
              to="/login"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors block text-center"
            >
              Login with New Password
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Link
            to="/login"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Password</h1>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create a strong new password for your account.
        </p>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Password Strength</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{passwordStrength.text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="mt-1">
                {newPassword === confirmPassword ? (
                  <p className="text-xs text-green-600 dark:text-green-400">Passwords match</p>
                ) : (
                  <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Password Requirements:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">{newPassword.length >= 8 ? '✓' : '○'}</span>
              At least 8 characters long
            </li>
            <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">{/[a-z]/.test(newPassword) ? '✓' : '○'}</span>
              Contains lowercase letter
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span>
              Contains uppercase letter
            </li>
            <li className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">{/\d/.test(newPassword) ? '✓' : '○'}</span>
              Contains number
            </li>
            <li className={`flex items-center {/[@$!%*?&]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">{/[@$!%*?&]/.test(newPassword) ? '✓' : '○'}</span>
              Contains special character (@$!%*?&)
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
