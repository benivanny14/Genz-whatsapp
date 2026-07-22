import React, { useState } from 'react';
import {
  X, Calendar, Heart, PhoneOff, Image, Smile, Eye, Users, MessageSquare,
  Download, Shield, Sparkles, ExternalLink
} from 'lucide-react';
import JumpToDate from './JumpToDate';
import StatusReaction from './StatusReaction';
import CallBlocker from './CallBlocker';
import GroupMediaGallery from './GroupMediaGallery';
import QuickEmojiReactions from './QuickEmojiReactions';
import StatusViewList from './StatusViewList';
import GroupMembersManager from './GroupMembersManager';

/**
 * FeatureIntegrationPanel - Central hub for all new features.
 * Place this component anywhere in ChatArea and it gives the user
 * access to JumpToDate, StatusReaction, CallBlocker, GroupMediaGallery,
 * QuickEmojiReactions, StatusViewList, and GroupMembersManager.
 * 
 * Usage in ChatArea.jsx:
 * 
 * 1. Import: import FeatureIntegrationPanel from './FeatureIntegrationPanel';
 * 2. Add state: const [showFeaturePanel, setShowFeaturePanel] = useState(false);
 * 3. Add button to header bar:
 *    <button onClick={() => setShowFeaturePanel(true)} 
 *      className="p-2 rounded-full hover:bg-white/10 transition-colors"
 *      title="More Features">
 *      <Grid3x3 size={18} className="text-purple-400" />
 *    </button>
 * 4. Render near bottom of ChatArea return:
 *    {showFeaturePanel && (
 *      <FeatureIntegrationPanel
 *        conversation={selectedConversation}
 *        messages={messages}
 *        messagesContainerRef={messagesContainerRef}
 *        currentUserId={user?._id || user?.id}
 *        onClose={() => setShowFeaturePanel(false)}
 *      />
 *    )}
 */

const FEATURES = [
  { id: 'jumpDate', icon: Calendar, label: 'Jump to Date', desc: 'Rukia tarehe maalum' },
  { id: 'reactions', icon: Smile, label: 'Quick Reactions', desc: 'Double-tap kujibu ❤️' },
  { id: 'callBlock', icon: PhoneOff, label: 'Call Blocker', desc: 'Zuia simu zisizotakiwa' },
  { id: 'mediaGallery', icon: Image, label: 'Media Gallery', desc: 'Picha/video zote mahali pamoja' },
  { id: 'statusReact', icon: Heart, label: 'Status Reaction', desc: 'React kwenye status' },
  { id: 'statusView', icon: Eye, label: 'Status Viewers', desc: 'Waliotazama status yako' },
  { id: 'groupMembers', icon: Users, label: 'Group Members', desc: 'Manage members & restrict' },
];

const FeatureIntegrationPanel = ({
  conversation,
  messages,
  messagesContainerRef,
  currentUserId,
  onClose,
}) => {
  const [activeFeature, setActiveFeature] = useState(null);

  const quickReactionsDemo = () => {
    // QuickEmojiReactions is used inline on each message bubble,
    // this just shows a tooltip explaining how to use it
    return (
      <div className="p-6 text-center">
        <Smile size={48} className="mx-auto mb-3 text-[#00a884]" />
        <h3 className="text-white font-bold mb-2">Quick Reactions</h3>
        <p className="text-gray-400 text-sm mb-4">
          Bonyeza mara mbili (double-tap) kwenye ujumbe wowote kutuma ❤️ haraka.
        </p>
        <p className="text-gray-500 text-xs">
          Au bonyeza na ushikilie (long-press) kuona reactions zote.
        </p>
        <div className="flex justify-center gap-2 mt-4 text-2xl">
          <span>❤️</span> <span>😂</span> <span>😮</span> <span>😢</span> <span>😡</span> <span>👍</span> <span>🔥</span>
        </div>
      </div>
    );
  };

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'jumpDate':
        return (
          <JumpToDate
            messages={messages}
            containerRef={messagesContainerRef}
            onClose={() => setActiveFeature(null)}
          />
        );
      case 'reactions':
        return quickReactionsDemo();
      case 'callBlock':
        return (
          <CallBlocker
            onClose={() => setActiveFeature(null)}
            onBlock={(num) => {
              const blocked = JSON.parse(localStorage.getItem('genz_blocked_numbers') || '[]');
              if (!blocked.includes(num)) {
                blocked.push(num);
                localStorage.setItem('genz_blocked_numbers', JSON.stringify(blocked));
              }
              alert(`📵 ${num} blocked from calling you`);
            }}
            onUnblock={(num) => {
              const blocked = JSON.parse(localStorage.getItem('genz_blocked_numbers') || '[]');
              const updated = blocked.filter(n => n !== num);
              localStorage.setItem('genz_blocked_numbers', JSON.stringify(updated));
            }}
          />
        );
      case 'mediaGallery':
        return (
          <GroupMediaGallery
            messages={messages}
            onClose={() => setActiveFeature(null)}
          />
        );
      case 'statusReact':
        return (
          <StatusReaction
            statusId="demo"
            onReact={async (id, emoji) => {
              alert(`✅ Reacted with ${emoji}`);
            }}
            onClose={() => setActiveFeature(null)}
          />
        );
      case 'statusView':
        return (
          <StatusViewList
            viewers={[
              { username: 'Demo User 1', viewedAt: new Date().toISOString() },
              { username: 'Demo User 2', viewedAt: new Date(Date.now() - 3600000).toISOString() },
            ]}
            onClose={() => setActiveFeature(null)}
          />
        );
      case 'groupMembers':
        return (
          <GroupMembersManager
            conversation={conversation}
            currentUserId={currentUserId}
            onClose={() => setActiveFeature(null)}
            onAddMember={() => alert('➕ Open contact picker to add member')}
            onRemoveMember={(id) => console.log('Remove member:', id)}
            onToggleRestrict={(val) => console.log('Restrict messaging:', val)}
            onToggleAdmin={(id, isAdmin) => console.log('Toggle admin:', id, isAdmin)}
          />
        );
      default:
        return null;
    }
  };

  // If a feature is active, render it as a modal overlay
  if (activeFeature) {
    return (
      <div className="fixed inset-0 z-[200]">
        {renderActiveFeature()}
      </div>
    );
  }

  // Main grid of feature buttons
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-2xl w-full max-w-md p-5 shadow-2xl border border-white/10 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">✨ More Features</h2>
            <p className="text-gray-400 text-xs mt-0.5">Bonyeza feature kufungua</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(feature => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00a884]/30 to-purple-500/30 flex items-center justify-center">
                <feature.icon size={22} className="text-white" />
              </div>
              <span className="text-white text-sm font-semibold">{feature.label}</span>
              <span className="text-gray-500 text-[10px] -mt-1">{feature.desc}</span>
            </button>
          ))}
        </div>

        {/* Usage Instructions */}
        <div className="mt-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-300 text-xs font-medium mb-1">📖 Jinsi ya kutumia:</p>
          <ul className="text-gray-400 text-[11px] space-y-1 ml-4 list-disc">
            <li>Bonyeza feature yoyote kufungua</li>
            <li>Tumia "Quick Reactions" kwa double-tap kwenye ujumbe</li>
            <li>Manage group members kwenye group chats</li>
            <li>Features hizi zitajumuishwa kwenye ChatArea baadaye</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FeatureIntegrationPanel;
