import { useState } from 'react';
import { X, Users, UserMinus, Lock, Globe, EyeOff } from 'lucide-react';

const StatusPrivacySettings = ({ currentPrivacy, onClose, onSave }) => {
  const [privacy, setPrivacy] = useState(currentPrivacy || 'contacts');
  const [excludedContacts, setExcludedContacts] = useState([]);
  const [includedContacts, setIncludedContacts] = useState([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const privacyOptions = [
    {
      value: 'everyone',
      label: 'Everyone',
      icon: Globe,
      description: 'Anyone can see your status'
    },
    {
      value: 'contacts',
      label: 'My Contacts',
      icon: Users,
      description: 'Only your contacts can see your status'
    },
    {
      value: 'contacts_except',
      label: 'My Contacts Except...',
      icon: UserMinus,
      description: 'All contacts except selected ones'
    },
    {
      value: 'only_share_with',
      label: 'Only Share With...',
      icon: EyeOff,
      description: 'Only selected contacts can see your status'
    },
    {
      value: 'only_me',
      label: 'Only Me',
      icon: Lock,
      description: 'Only you can see this status'
    }
  ];

  const handleSave = () => {
    const privacyData = {
      privacy,
      excludedViewers: excludedContacts,
      includedViewers: includedContacts
    };
    onSave(privacyData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] backdrop-blur-sm">
      <div className="bg-dark-surface rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-dark-border overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
          <h3 className="font-bold">Status Privacy</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-dark-textSecondary">
            Choose who can see your status updates
          </p>

          {/* Privacy Options */}
          <div className="space-y-2">
            {privacyOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = privacy === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setPrivacy(option.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isSelected ? 'bg-primary-600/20 border-2 border-primary-500' : 'bg-dark-hover border-2 border-transparent hover:border-dark-border'
                  }`}
                >
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-primary-600 text-white' : 'bg-dark-bg text-dark-text'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-dark-text">{option.label}</h4>
                    <p className="text-xs text-dark-textSecondary">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Contact Picker for specific privacy options */}
          {(privacy === 'contacts_except' || privacy === 'only_share_with') && (
            <div className="bg-dark-bg rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-dark-text">
                  {privacy === 'contacts_except' ? 'Exclude Contacts' : 'Include Contacts'}
                </h4>
                <button
                  onClick={() => setShowContactPicker(true)}
                  className="text-primary-500 text-sm font-medium hover:underline"
                >
                  {privacy === 'contacts_except' ? 'Add Contacts' : 'Select Contacts'}
                </button>
              </div>
              
              {privacy === 'contacts_except' && excludedContacts.length === 0 && (
                <p className="text-xs text-dark-textSecondary">No contacts excluded</p>
              )}
              
              {privacy === 'only_share_with' && includedContacts.length === 0 && (
                <p className="text-xs text-dark-textSecondary">No contacts selected</p>
              )}
              
              {/* Selected contacts list would go here */}
              <div className="flex flex-wrap gap-2">
                {(privacy === 'contacts_except' ? excludedContacts : includedContacts).map((contact) => (
                  <div
                    key={contact._id}
                    className="bg-dark-hover px-3 py-1 rounded-full text-sm text-dark-text flex items-center gap-2"
                  >
                    {contact.username}
                    <button
                      onClick={() => {
                        if (privacy === 'contacts_except') {
                          setExcludedContacts(prev => prev.filter(c => c._id !== contact._id));
                        } else {
                          setIncludedContacts(prev => prev.filter(c => c._id !== contact._id));
                        }
                      }}
                      className="text-dark-textSecondary hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-dark-border text-dark-text hover:bg-dark-hover transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPrivacySettings;
