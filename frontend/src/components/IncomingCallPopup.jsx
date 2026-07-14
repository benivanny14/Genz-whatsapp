import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneOff, Mic, Camera, AlertCircle } from 'lucide-react';

const IncomingCallPopup = ({ call, onAccept, onReject }) => {
  const [permissionsNeeded, setPermissionsNeeded] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  if (!call) return null;

  const isVideoCall = call.type === 'video';
  const callerName = call.user?.username || call.callerName || 'Unknown';
  const profilePic = call.user?.profilePicture || call.callerProfilePic || null;

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check if we can access media devices
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
        // If successful, stop the stream immediately (we just wanted to check)
        stream.getTracks().forEach(track => track.stop());
        setPermissionsNeeded(false);
      } catch (error) {
        console.log('[IncomingCallPopup] Permission check failed:', error);
        setPermissionsNeeded(true);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionError('Microphone and camera access denied. Please enable in browser settings.');
        } else {
          setPermissionError('Please allow microphone and camera access to answer calls.');
        }
      }
    };

    checkPermissions();
  }, [isVideoCall]);

  const requestPermissions = async () => {
    setIsRequestingPermission(true);
    setPermissionError('');
    try {
      // Request permissions with explicit user interaction
      const constraints = {
        audio: true,
        video: isVideoCall
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      setPermissionsNeeded(false);
    } catch (error) {
      console.error('[IncomingCallPopup] Permission request failed:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Permission denied. Please allow microphone/camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone or camera found on this device.');
      } else {
        setPermissionError('Failed to access microphone/camera. Please try again.');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleAccept = async () => {
    if (permissionsNeeded) {
      await requestPermissions();
      return;
    }
    onAccept();
  };

  return (
    <div className="call-notification-popup">
      <div className="flex items-center gap-3 mb-4">
        {profilePic ? (
          <img src={profilePic} alt={callerName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white">
            {callerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{callerName}</h3>
          <p className="text-sm text-gray-300">
            {isVideoCall ? 'Video Call' : 'Voice Call'}
          </p>
        </div>
      </div>

      {/* Permission Warning */}
      {permissionsNeeded && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-300 text-sm font-medium">Permissions Required</p>
              <p className="text-red-200 text-xs mt-1">
                {permissionError || 'Please allow microphone and camera access to answer this call.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <PhoneOff size={18} />
          Decline
        </button>
        {permissionsNeeded ? (
          <button
            onClick={requestPermissions}
            disabled={isRequestingPermission}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestingPermission ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Mic size={18} />
                {isVideoCall && <Camera size={18} />}
                Allow Access
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            {isVideoCall ? <Video size={18} /> : <Phone size={18} />}
            Accept
          </button>
        )}
      </div>
    </div>
  );
};

export default IncomingCallPopup;