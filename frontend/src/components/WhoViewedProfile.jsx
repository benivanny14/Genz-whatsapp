import React, { useEffect, useState } from 'react';
import { X, Eye, Trash2 } from 'lucide-react';
import profileViewService from '../services/profileViewService';

const formatWhen = (iso) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Sasa hivi';
  if (mins < 60) return `${mins} min zilizopita`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saa zilizopita`;
  const days = Math.floor(hrs / 24);
  return `${days} siku zilizopita`;
};

const WhoViewedProfile = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await profileViewService.getMyViewers();
        setEnabled(data.enabled !== false);
        setViewers(data.viewers || []);
      } catch (err) {
        setError('Imeshindwa kupakia orodha');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleClear = async () => {
    try {
      await profileViewService.clearViewers();
      setViewers([]);
    } catch (_) {
      // no-op
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
            <Eye size={18} className="text-indigo-500" /> Who Viewed My Profile
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">Inapakia...</p>
        ) : error ? (
          <p className="text-red-500 text-sm text-center py-8">{error}</p>
        ) : !enabled ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Washa "Who Viewed My Profile" kwenye GENZ Mods ili kuona orodha hii.
          </p>
        ) : viewers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Hakuna aliyetazama profile yako bado.</p>
        ) : (
          <div className="overflow-y-auto space-y-2 flex-1">
            {viewers.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <img
                  src={v.user?.profilePicture || '/default-avatar.png'}
                  alt={v.user?.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {v.user?.name || v.user?.username || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400">{formatWhen(v.viewedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {enabled && viewers.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-4 w-full py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Futa Orodha
          </button>
        )}
      </div>
    </div>
  );
};

export default WhoViewedProfile;
