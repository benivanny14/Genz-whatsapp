import React from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';

const IncomingCallPopup = ({ call, onAccept, onReject }) => {
  if (!call) return null;

  const isVideoCall = call.type === 'video';
  const callerName = call.user?.username || call.callerName || 'Unknown';
  const profilePic = call.user?.profilePicture || call.callerProfilePic || null;

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

      <div className="flex gap-3">
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <PhoneOff size={18} />
          Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          {isVideoCall ? <Video size={18} /> : <Phone size={18} />}
          Accept
        </button>
      </div>
    </div>
  );
};

export default IncomingCallPopup;