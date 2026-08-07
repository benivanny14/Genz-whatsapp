import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { CirclePlus, Camera, MoreHorizontal } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const StatusBar = () => {
  const { user, statuses, getStatuses } = useChat();
  const [myStatus, setMyStatus] = useState(null);
  const [contactStatuses, setContactStatuses] = useState([]);

  useEffect(() => {
    // Load statuses
    if (getStatuses) {
      getStatuses();
    }
  }, [getStatuses]);

  useEffect(() => {
    if (statuses && user) {
      // Filter my status
      const myStatusData = statuses.filter(s => String(s.user) === String(user._id || user.id));
      setMyStatus(myStatusData);

      // Filter contact statuses
      const contactStatusData = statuses.filter(s => String(s.user) !== String(user._id || user.id));
      setContactStatuses(contactStatusData);
    }
  }, [statuses, user]);

  const getStatusRingColor = (status) => {
    if (!status) return 'border-gray-500';
    
    const now = new Date();
    const expiresAt = new Date(status.expiresAt);
    
    if (now > expiresAt) return 'border-gray-500'; // Expired
    
    // Check if viewed
    const isViewed = status.views?.some(v => String(v.user) === String(user._id || user.id));
    
    if (isViewed) return 'border-blue-500'; // Viewed
    return 'border-green-500'; // Unseen
  };

  return (
    <div className="bg-dark-surface border-b border-dark-border p-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-none">
        {/* My Status */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full border-2 ${getStatusRingColor(myStatus?.[0])} p-0.5`}>
              <div className="w-full h-full rounded-full bg-primary-600 flex items-center justify-center overflow-hidden">
                {user?.profilePicture ? (
                  <img
                    src={getAvatarUrl(user.profilePicture)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-lg">
                    {user?.username?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
    </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-1 border-2 border-dark-surface">
              <CirclePlus size={16} className="text-white" />
            </div>
          </div>
          <span className="text-xs text-dark-text">My Status</span>
        </div>

        {/* Contact Statuses */}
        {contactStatuses.map((status) => (
          <div key={status._id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-2 ${getStatusRingColor(status)} p-0.5`}>
                <div className="w-full h-full rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                  {status.mediaUrl ? (
                    <img
                      src={status.mediaUrl}
                      alt="Status"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {status.user?.username?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs text-dark-text truncate w-16 text-center">
              {status.user?.username || 'Unknown'}
            </span>
          </div>
        ))}

        {/* Add Status Button */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-dark-hover flex items-center justify-center border-2 border-dashed border-dark-textSecondary">
            <Camera size={24} className="text-dark-textSecondary" />
          </div>
          <span className="text-xs text-dark-text">Add Status</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
