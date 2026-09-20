import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const detectDeviceInfo = () => {
  const ua = navigator.userAgent || '';
  let platform = 'Unknown';
  let browser = 'Unknown';
  let deviceType = 'web';

  if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
  else if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Linux/i.test(ua)) platform = 'Linux';

  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'mobile';

  return {
    deviceName: `${platform} ${browser}`,
    deviceType,
    platform,
    browser,
  };
};

const PairDevice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pairDevice } = useChat();
  const [status, setStatus] = useState('pairing'); // pairing, success, error
  const [message, setMessage] = useState('Linking device...');

  useEffect(() => {
    const token = searchParams.get('token');
    const deviceId = searchParams.get('deviceId');

    if (!token) {
      setStatus('error');
      setMessage('Invalid pairing link.');
      return;
    }

    const pair = async () => {
      try {
        const deviceInfo = detectDeviceInfo();
        const result = await pairDevice(token, { ...deviceInfo, deviceId });
        if (result?.success) {
          setStatus('success');
          setMessage('Device linked successfully!');
          setTimeout(() => navigate('/linked-devices', { replace: true }), 1500);
        } else {
          setStatus('error');
          setMessage(result?.message || 'Failed to link device.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err?.message || 'An error occurred while linking the device.');
      }
    };

    pair();
  }, [searchParams, pairDevice, navigate]);

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-4">
      <div className="bg-[#111b21] rounded-xl p-8 max-w-md w-full shadow-2xl text-center border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Device Pairing</h2>
        {status === 'pairing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a884] mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="text-[#00a884] text-5xl mb-4">✓</div>
        )}
        {status === 'error' && (
          <div className="text-red-400 text-5xl mb-4">✗</div>
        )}
        <p className="text-[#8696a0]">{message}</p>
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/linked-devices')}
            className="mt-6 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c] transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PairDevice;
