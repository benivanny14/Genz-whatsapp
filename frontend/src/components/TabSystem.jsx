import React, { useState } from 'react';
import { Plus, X, Users, Briefcase, User, Hash } from 'lucide-react';

const DEFAULT_TABS = [
  { id: 'all', name: 'All', icon: Hash, color: '#00a884' },
  { id: 'personal', name: 'Personal', icon: User, color: '#00a884' },
  { id: 'work', name: 'Work', icon: Briefcase, color: '#0084a8' },
  { id: 'groups', name: 'Groups', icon: Users, color: '#a80084' },
];

const TabSystem = ({ activeTab, onTabChange, onAddTab, tabs = DEFAULT_TABS }) => {
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleAddTab = () => {
    if (newTabName.trim()) {
      onAddTab({
        id: newTabName.toLowerCase().replace(/\s+/g, '-'),
        name: newTabName.trim(),
        icon: Hash,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
      setNewTabName('');
      setShowAddTab(false);
    }
  };

  return (
    <div className="tab-container">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            style={activeTab === tab.id ? { backgroundColor: tab.color, borderColor: tab.color } : {}}
          >
            <Icon size={14} className="inline mr-1" />
            {tab.name}
          </button>
        );
      })}
      
      {/* Add Tab Button */}
      <button
        onClick={() => setShowAddTab(true)}
        className="add-tab-button"
      >
        <Plus size={14} className="inline" />
      </button>

      {/* Add Tab Modal */}
      {showAddTab && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60" onClick={() => setShowAddTab(false)}>
          <div 
            className="bg-[#233138] rounded-lg p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Create New Tab</h3>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="Tab name..."
              className="w-full px-3 py-2 bg-[#202c33] border border-[#37404a] rounded-lg text-white focus:outline-none focus:border-[#00a884]"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddTab(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTab}
                className="flex-1 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f] transition-colors"
              >
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