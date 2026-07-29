import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Check, 
  RefreshCw, 
  Shield, 
  UserPlus, 
  FileText, 
  Link, 
  UserCheck, 
  Megaphone, 
  BarChart3, 
  Calendar,
  Settings
} from 'lucide-react';

const GroupModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState({
    groupAdminTools: false,
    groupMemberLimitIncrease: false,
    groupDescriptionLength: false,
    groupLinkCustomization: false,
    groupJoinRequestsApproval: false,
    groupAnnouncements: false,
    groupPolls: false,
    groupEvents: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/group-mods/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleToggle = async (key, endpoint) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/group-mods/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess('Setting updated successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to update setting');
      }
    } catch (error) {
      setError('Error updating setting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupFeatures = [
    {
      key: 'groupAdminTools',
      title: 'Group Admin Tools',
      description: 'Advanced admin management tools',
      icon: Shield,
      color: 'blue',
      endpoint: 'admin-tools'
    },
    {
      key: 'groupMemberLimitIncrease',
      title: 'Member Limit Increase',
      description: 'Add more members than default limit',
      icon: UserPlus,
      color: 'purple',
      endpoint: 'member-limit'
    },
    {
      key: 'groupDescriptionLength',
      title: 'Description Length',
      description: 'Longer group descriptions',
      icon: FileText,
      color: 'green',
      endpoint: 'description-length'
    },
    {
      key: 'groupLinkCustomization',
      title: 'Link Customization',
      description: 'Custom group invite links',
      icon: Link,
      color: 'orange',
      endpoint: 'link-customization'
    },
    {
      key: 'groupJoinRequestsApproval',
      title: 'Join Requests Approval',
      description: 'Approve join requests manually',
      icon: UserCheck,
      color: 'red',
      endpoint: 'join-approval'
    },
    {
      key: 'groupAnnouncements',
      title: 'Group Announcements',
      description: 'Send announcements to groups',
      icon: Megaphone,
      color: 'pink',
      endpoint: 'announcements'
    },
    {
      key: 'groupPolls',
      title: 'Group Polls',
      description: 'Create polls in groups',
      icon: BarChart3,
      color: 'indigo',
      endpoint: 'polls'
    },
    {
      key: 'groupEvents',
      title: 'Group Events',
      description: 'Create and manage group events',
      icon: Calendar,
      color: 'teal',
      endpoint: 'events'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Group MODs</h2>
              <p className="text-xs text-gray-500">8 advanced group features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Group Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.key}
                  onClick={() => handleToggle(feature.key, feature.endpoint)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings[feature.key]
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-gray-50 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[feature.color]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{feature.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      settings[feature.key]
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-gray-300'
                    }`}>
                      {settings[feature.key] && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">About Group MODs</p>
                <p className="text-sm text-gray-600 mt-1">
                  These advanced group features give you complete control over your WhatsApp groups. 
                  Manage members, create polls, events, and announcements with ease.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{Object.values(settings).filter(v => v).length} of {groupFeatures.length} features enabled</span>
            <button
              onClick={fetchSettings}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GroupModsPanel;
