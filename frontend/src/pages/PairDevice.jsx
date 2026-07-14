import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const PairDevice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pairDevice } = useChat();
  const [status, setStatus] = useState('pairing'); // pairing, success, error
  const [message, setMessage] = useState('Linking device...');

  useEffect(() => {
    const token = searchParams.get('token');
    const deviceId = searchParams.get('deviceId');

    if (!token || !deviceId) {
      setStatus('error');
      setMessage('Invalid pairing link.');
      return;
    }

    const pair = async () => {
      try {
        const result = await pairDevice(token);
        if (result && result.success) {
          setStatus('success');
          setMessage('Device linked successfully!');
          setTimeout(() => navigate('/linked-devices'), 2000);
        } else {
          setStatus('error');
          setMessage(result?.message || 'Failed to link device.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred while linking the device.');
      }
    };

    pair();
  }, [searchParams, pairDevice, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Device Pairing</h2>
        {status === 'pairing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="text-green-500 text-5xl mb-4">✓</div>
        )}
        {status === 'error' && (
          <div className="text-red-500 text-5xl mb-4">✗</div>
        )}
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/linked-devices')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PairDevice;
