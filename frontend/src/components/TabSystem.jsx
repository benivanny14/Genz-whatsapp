import React, { useState } from 'react';
import { Plus, X, Users, Briefcase, User, Hash, MessageCircle } from 'lucide-react';

const ICON_MAP = {
  all: MessageCircle, personal: User, work: Briefcase, groups: Users
};

const DEFAULT_TABS = [
  { id: 'All', name: 'All', icon: MessageCircle, color: '#00a884' },
  { id: 'Personal', name: 'Personal', icon: User, color: '#25d366' },
  { id: 'Work', name: 'Work', icon: Briefcase, color: '#0084a8' },
  { id: 'Groups', name: 'Groups', icon: Users, color: '#a80084' },
];

const TabSystem = ({ activeTab, onTabChange, onAddTab, onDeleteTab, tabs = DEFAULT_TABS, defaultTabs = [] }) => {
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleAddTab = () => {
    const name = newTabName.trim();
    if (!name) return;
    onAddTab?.({
      id: name,
      name,
      icon: Hash,
      color: `hsl(${Math.floor(Math.random() * 360)},70%,50%)`
    });
    setNewTabName('');
    setShowAddTab(false);
  };

  return (
    <div className="relative flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
      {tabs.map((tab) => {
        const Icon = ICON_MAP[tab.id?.toLowerCase()] || tab.icon || Hash;
        const isActive = activeTab === tab.id || activeTab === tab.name;
        const isDefault = defaultTabs.includes(tab.id) || defaultTabs.includes(tab.name);
        return (
          <div key={tab.id} className="relative flex items-center flex-shrink-0">
            <button
              onClick={() => onTabChange(tab.id || tab.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap
                ${isActive
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-[#37404a] text-[#8696a0] hover:bg-[#202c33] hover:text-white'}`}
              style={isActive ? { backgroundColor: tab.color || '#00a884', borderColor: tab.color || '#00a884' } : {}}
            >
              <Icon size={11} />
              {tab.name}
            </button>
            {!isDefault && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteTab?.(tab.id || tab.name); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#37404a] text-[#8696a0] hover:text-red-400 flex items-center justify-center transition-colors"
                title={`Remove ${tab.name}`}
               aria-label="Close">
                <X size={9} />
              </button>
            )}
          </div>
        );
      })}

      {/* Add new tab button */}
      <button
        onClick={() => setShowAddTab(true)}
        className="flex-shrink-0 w-7 h-7 rounded-full border border-[#37404a] text-[#8696a0] hover:bg-[#202c33] hover:text-white flex items-center justify-center transition-all"
        title="Add new tab" aria-label="Add new tab"
      >
        <Plus size={13} />
      </button>

      {/* Add tab modal */}
      {showAddTab && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setShowAddTab(false)}>
          <div className="bg-[#233138] rounded-xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-4">New Tab</h3>
            <input
              type="text"
              value={newTabName}
              onChange={e => setNewTabName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTab()}
              placeholder="Tab name (e.g. Family, Friends)"
              className="w-full px-3 py-2.5 bg-[#111b21] border border-[#37404a] rounded-lg text-white text-sm placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition-colors"
              autoFocus
              maxLength={20}
            />
            <p className="text-[#8696a0] text-xs mt-2">Long-press any chat to assign it to this tab</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddTab(false)}
                className="flex-1 px-4 py-2 text-[#8696a0] hover:text-white text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleAddTab}
                className="flex-1 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-sm font-medium transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabSystem;
