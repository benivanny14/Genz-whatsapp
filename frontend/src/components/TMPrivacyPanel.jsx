import React, { useState, useEffect } from 'react';
import { X, Snowflake, EyeOff, Clock, Eye, Ghost, Bell, UserCheck, Lock, Shield } from 'lucide-react';

const TMPrivacyPanel = ({ onClose, onPrivacyUpdate }) => {
  const [freezeLastSeen, setFreezeLastSeen] = useState(false);
  const [hideBlueTicks, setHideBlueTicks] = useState(false);
  const [hideDoubleTicks, setHideDoubleTicks] = useState(false);
  const [hideTypingIndicator, setHideTypingIndicator] = useState(false);
  const [hideRecordingIndicator, setHideRecordingIndicator] = useState(false);
  const [antiRevoke, setAntiRevoke] = useState(false);
  const [antiViewOnce, setAntiViewOnce] = useState(false);
  const [disableForwardedTag, setDisableForwardedTag] = useState(false);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [hideStatusView, setHideStatusView] = useState(false);
  const [hideReadReceiptsForStatus, setHideReadReceiptsForStatus] = useState(false);
  const [whoViewedMyProfile, setWhoViewedMyProfile] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [contactOnlineNotifier, setContactOnlineNotifier] = useState(false);
  const [autoDownloadStatus, setAutoDownloadStatus] = useState(false);
  const [languagePerChat, setLanguagePerChat] = useState(false);
  const [hideForwardTag, setHideForwardTag] = useState(false);
  const [customTickPerContact, setCustomTickPerContact] = useState(false);
  const [customEmojiStyle, setCustomEmojiStyle] = useState('default');

  useEffect(() => {
    // Load existing TM privacy settings
    const loadTMPrivacySettings = () => {
      try {
        const tmPrivacy = JSON.parse(localStorage.getItem('genz_tm_privacy') || '{}');
        setFreezeLastSeen(tmPrivacy.freezeLastSeen || false);
        setHideBlueTicks(tmPrivacy.hideBlueTicks || false);
        setHideDoubleTicks(tmPrivacy.hideDoubleTicks || false);
        setHideTypingIndicator(tmPrivacy.hideTypingIndicator || false);
        setHideRecordingIndicator(tmPrivacy.hideRecordingIndicator || false);
        setAntiRevoke(tmPrivacy.antiRevoke || false);
        setAntiViewOnce(tmPrivacy.antiViewOnce || false);
        setDisableForwardedTag(tmPrivacy.disableForwardedTag || false);
        setHideOnlineStatus(tmPrivacy.hideOnlineStatus || false);
        setHideStatusView(tmPrivacy.hideStatusView || false);
        setHideReadReceiptsForStatus(tmPrivacy.hideReadReceiptsForStatus || false);
        setWhoViewedMyProfile(tmPrivacy.whoViewedMyProfile || false);
        setGhostMode(tmPrivacy.ghostMode || false);
        setContactOnlineNotifier(tmPrivacy.contactOnlineNotifier || false);
        setAutoDownloadStatus(tmPrivacy.autoDownloadStatus || false);
        setLanguagePerChat(tmPrivacy.languagePerChat || false);
        setHideForwardTag(tmPrivacy.hideForwardTag || false);
        setCustomTickPerContact(tmPrivacy.customTickPerContact || false);
        setCustomEmojiStyle(tmPrivacy.customEmojiStyle || 'default');
      } catch (error) {
        console.error('Error loading TM privacy settings:', error);
      }
    };
    loadTMPrivacySettings();
  }, []);

  const handleSave = () => {
    const tmPrivacySettings = {
      freezeLastSeen,
      hideBlueTicks,
      hideDoubleTicks,
      hideTypingIndicator,
      hideRecordingIndicator,
      antiRevoke,
      antiViewOnce,
      disableForwardedTag,
      hideOnlineStatus,
      hideStatusView,
      hideReadReceiptsForStatus,
      whoViewedMyProfile,
      ghostMode,
      contactOnlineNotifier,
      autoDownloadStatus,
      languagePerChat,
      hideForwardTag,
      customTickPerContact,
      customEmojiStyle
    };

    try {
      localStorage.setItem('genz_tm_privacy', JSON.stringify(tmPrivacySettings));
      
      if (onPrivacyUpdate) {
        onPrivacyUpdate(tmPrivacySettings);
      }
      onClose();
    } catch (error) {
      console.error('Error saving TM privacy settings:', error);
    }
  };

  const emojiStyles = [
    { id: 'default', label: 'Default', preview: '😀' },
    { id: 'ios', label: 'iOS', preview: '😀' },
    { id: 'android', label: 'Android', preview: '😀' },
    { id: 'facebook', label: 'Facebook', preview: '😀' },
    { id: 'twitter', label: 'Twitter', preview: '😀' }
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Shield className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">TM WhatsApp Privacy</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Freeze Last Seen */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Snowflake className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Freeze Last Seen</h3>
                <p className="text-white/60 text-xs">Stop your last seen from updating</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={freezeLastSeen}
                onChange={(e) => setFreezeLastSeen(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Freeze last seen timestamp</span>
            </label>
          </div>

          {/* Hide Blue Ticks */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Blue Ticks</h3>
                <p className="text-white/60 text-xs">Hide read receipts from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideBlueTicks}
                onChange={(e) => setHideBlueTicks(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide blue ticks (read receipts)</span>
            </label>
          </div>

          {/* Hide Double Ticks */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Double Ticks</h3>
                <p className="text-white/60 text-xs">Hide delivery receipts from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideDoubleTicks}
                onChange={(e) => setHideDoubleTicks(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide double ticks (delivery receipts)</span>
            </label>
          </div>

          {/* Hide Typing Indicator */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Typing Indicator</h3>
                <p className="text-white/60 text-xs">Hide "typing..." from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideTypingIndicator}
                onChange={(e) => setHideTypingIndicator(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide typing indicator</span>
            </label>
          </div>

          {/* Hide Recording Indicator */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Recording Indicator</h3>
                <p className="text-white/60 text-xs">Hide "recording audio..." from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideRecordingIndicator}
                onChange={(e) => setHideRecordingIndicator(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide recording indicator</span>
            </label>
          </div>

          {/* Anti-Revoke */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Anti-Revoke</h3>
                <p className="text-white/60 text-xs">See deleted messages from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={antiRevoke}
                onChange={(e) => setAntiRevoke(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Show deleted messages</span>
            </label>
          </div>

          {/* Anti-View Once */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Anti-View Once</h3>
                <p className="text-white/60 text-xs">View view-once media multiple times</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={antiViewOnce}
                onChange={(e) => setAntiViewOnce(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Bypass view-once restriction</span>
            </label>
          </div>

          {/* Disable Forwarded Tag */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Disable Forwarded Tag</h3>
                <p className="text-white/60 text-xs">Hide "Forwarded" label on messages</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={disableForwardedTag}
                onChange={(e) => setDisableForwardedTag(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Remove forwarded tag</span>
            </label>
          </div>

          {/* Hide Online Status */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Ghost className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Online Status</h3>
                <p className="text-white/60 text-xs">Hide "online" from others</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideOnlineStatus}
                onChange={(e) => setHideOnlineStatus(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide online status</span>
            </label>
          </div>

          {/* Hide Status View */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Status View</h3>
                <p className="text-white/60 text-xs">Hide that you viewed someone's status</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideStatusView}
                onChange={(e) => setHideStatusView(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide status view from others</span>
            </label>
          </div>

          {/* Hide Read Receipts for Status */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Read Receipts for Status</h3>
                <p className="text-white/60 text-xs">Hide that you read status</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideReadReceiptsForStatus}
                onChange={(e) => setHideReadReceiptsForStatus(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide status read receipts</span>
            </label>
          </div>

          {/* Who Viewed My Profile */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Who Viewed My Profile</h3>
                <p className="text-white/60 text-xs">See who viewed your profile</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={whoViewedMyProfile}
                onChange={(e) => setWhoViewedMyProfile(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable profile view tracking</span>
            </label>
          </div>

          {/* Ghost Mode */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Ghost className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Ghost Mode</h3>
                <p className="text-white/60 text-xs">Be invisible - no online, typing, or blue ticks</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ghostMode}
                onChange={(e) => setGhostMode(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable ghost mode</span>
            </label>
          </div>

          {/* Contact Online Notifier */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Contact Online Notifier</h3>
                <p className="text-white/60 text-xs">Get notified when contacts come online</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={contactOnlineNotifier}
                onChange={(e) => setContactOnlineNotifier(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable online notifications</span>
            </label>
          </div>

          {/* Auto Download Status */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Auto Download Status</h3>
                <p className="text-white/60 text-xs">Automatically download status updates</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDownloadStatus}
                onChange={(e) => setAutoDownloadStatus(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Auto-download status to gallery</span>
            </label>
          </div>

          {/* Language Per Chat */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Language Per Chat</h3>
                <p className="text-white/60 text-xs">Set different language for each chat</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={languagePerChat}
                onChange={(e) => setLanguagePerChat(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable per-chat language</span>
            </label>
          </div>

          {/* Hide Forward Tag */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Hide Forward Tag</h3>
                <p className="text-white/60 text-xs">Hide forward tag on messages</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideForwardTag}
                onChange={(e) => setHideForwardTag(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Hide forward tag</span>
            </label>
          </div>

          {/* Custom Tick Per Contact */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Custom Tick Per Contact</h3>
                <p className="text-white/60 text-xs">Set different tick visibility per contact</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={customTickPerContact}
                onChange={(e) => setCustomTickPerContact(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable per-contact tick settings</span>
            </label>
          </div>

          {/* Custom Emoji Style */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Custom Emoji Style</h3>
                <p className="text-white/60 text-xs">Change emoji appearance</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {emojiStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCustomEmojiStyle(style.id)}
                  className={`p-2 rounded-lg text-2xl transition-colors ${
                    customEmojiStyle === style.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {style.preview}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Save Privacy Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TMPrivacyPanel;
