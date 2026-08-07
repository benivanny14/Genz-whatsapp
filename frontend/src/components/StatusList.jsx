import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { getAvatarUrl } from '../utils/avatar';
import { Eye, Clock, MoreHorizontal } from 'lucide-react';
import StatusViewer from './StatusViewer';

const StatusList = () => {
  const { user, statuses, getStatuses } = useChat();
  const [groupedStatuses, setGroupedStatuses] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    if (getStatuses) {
      getStatuses();
    }
  }, [getStatuses]);

  useEffect(() => {
    if (statuses && user && Array.isArray(statuses)) {
      // Group statuses by user
      const grouped = {};

      statuses.forEach(status => {
        const userId = String(status.user._id || status.user);
        if (!grouped[userId]) {
          grouped[userId] = {
            user: status.user,
            statuses: [],
            lastUpdated: new Date(status.createdAt)
          };
        }
        grouped[userId].statuses.push(status);
        if (new Date(status.createdAt) > grouped[userId].lastUpdated) {
          grouped[userId].lastUpdated = new Date(status.createdAt);
        }
      });

      // Sort by last updated
      const sorted = Object.values(grouped).sort((a, b) => b.lastUpdated - a.lastUpdated);
      setGroupedStatuses(sorted);
    } else {
      setGroupedStatuses([]);
    }
  }, [statuses, user]);

  const getStatusRingColor = (statusGroup) => {
    if (!statusGroup.statuses || statusGroup.statuses.length === 0) {
      return 'border-gray-500';
    }

    const now = new Date();
    const hasUnseen = statusGroup.statuses.some(status => {
      const expiresAt = new Date(status.expiresAt);
      if (now > expiresAt) return false;
      const isViewed = status.views?.some(v => String(v.user) === String(user._id || user.id));
      return !isViewed;
    });

    if (hasUnseen) return 'border-green-500';
    return 'border-blue-500';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleStatusClick = (statusGroup) => {
    setSelectedStatus(statusGroup);
  };

  if (!statuses || statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-dark-textSecondary">
        <Clock size={48} className="mb-4" />
        <p className="text-lg font-medium">No status updates</p>
        <p className="text-sm">Be the first to share your status</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {selectedStatus && (
        <StatusViewer
          statusGroup={selectedStatus}
          onClose={() => setSelectedStatus(null)}
        />
      )}

      <div className="space-y-2 p-2">
        {groupedStatuses.map((group) => (
          <div
            key={group.user._id || group.user}
            onClick={() => handleStatusClick(group)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-hover cursor-pointer transition-colors"
          >
            {/* Avatar with status ring */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full border-2 ${getStatusRingColor(group)} p-0.5`}>
                <div className="w-full h-full rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                  {group.user.profilePicture ? (
                    <img
                      src={getAvatarUrl(group.user.profilePicture)}
                      alt={group.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {group.user.username?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User info and status preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-dark-text truncate">
                  {group.user.username || 'Unknown'}
                </h4>
                <span className="text-xs text-dark-textSecondary">
                  {formatTimeAgo(group.lastUpdated)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-dark-textSecondary truncate">
                  {group.statuses.length} status{group.statuses.length !== 1 ? 'es' : ''}
                </span>
                {group.statuses.some(s => s.type === 'image') && (
                  <span className="text-xs bg-dark-hover px-1.5 py-0.5 rounded">📷</span>
                )}
                {group.statuses.some(s => s.type === 'video') && (
                  <span className="text-xs bg-dark-hover px-1.5 py-0.5 rounded">🎬</span>
                )}
                {group.statuses.some(s => s.type === 'text') && (
                  <span className="text-xs bg-dark-hover px-1.5 py-0.5 rounded">📝</span>
                )}
              </div>
            </div>

            {/* View count */}
            <div className="flex items-center gap-1 text-dark-textSecondary flex-shrink-0">
              <Eye size={16} />
              <span className="text-sm">
                {group.statuses.reduce((sum, s) => sum + (s.views?.length || 0), 0)}
              </span>
            </div>

            {/* More options */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle more options
              }}
              className="p-1 hover:bg-dark-hover rounded-full transition-colors"
            >
              <MoreHorizontal size={20} className="text-dark-textSecondary" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusList;
