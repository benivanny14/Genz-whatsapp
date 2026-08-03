import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Bookmark, Folder, CheckCircle, Save } from 'lucide-react';

const StatusSavePanel = ({ onClose, status, onSave }) => {
  const [saveLocation, setSaveLocation] = useState('gallery');
  const [createFolder, setCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [folders, setFolders] = useState([
    { id: 'default', label: 'Default', count: 12 },
    { id: 'favorites', label: 'Favorites', count: 8 },
    { id: 'memories', label: 'Memories', count: 15 },
    { id: 'work', label: 'Work', count: 5 }
  ]);

  const saveLocations = [
    { id: 'gallery', label: 'Phone Gallery', icon: Bookmark },
    { id: 'device', label: 'Device Storage', icon: Save },
    { id: 'cloud', label: 'Cloud Storage', icon: Folder }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folder: selectedFolder,
          location: saveLocation
        })
      });

      const data = await response.json();
      if (data.success) {
        const saveData = {
          statusId: status?._id || status?.id,
          location: saveLocation,
          folder: selectedFolder,
          newFolder: createFolder ? newFolderName : null,
          savedAt: new Date().toISOString()
        };

        if (onSave) {
          onSave(saveData);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error saving status:', error);
      alert('Failed to save status. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const id = `folder-${Date.now()}`;
      setFolders(prev => [...prev, { id, label: newFolderName.trim(), count: 0 }]);
      setSelectedFolder(id);
      setCreateFolder(false);
      setNewFolderName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Bookmark className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Save Status</h2>
              <p className="text-white/60 text-xs">Save to your collection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Status to Save</p>
            <p className="text-white text-sm">{status?.content || status?.caption || 'No content'}</p>
            <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
              <span>Type: {status?.type || 'unknown'}</span>
              <span>•</span>
              <span>{new Date(status?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Save Location */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Save Location</label>
            <div className="grid grid-cols-3 gap-2">
              {saveLocations.map((location) => {
                const Icon = location.icon;
                return (
                  <button
                    key={location.id}
                    onClick={() => setSaveLocation(location.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                      saveLocation === location.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs">{location.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/60 text-xs">Save to Folder</label>
              <button
                onClick={() => setCreateFolder(!createFolder)}
                className="text-[#00a884] text-xs hover:text-[#008f6f]"
              >
                + New Folder
              </button>
            </div>

            {createFolder && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none text-sm"
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm"
                >
                  Create
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`p-3 rounded-xl text-left transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-[#00a884]/20 border border-[#00a884] text-white'
                      : 'bg-white/10 border border-transparent text-white/70 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{folder.label}</span>
                    <span className="text-white/40 text-xs">{folder.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save Options */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#00a884] focus:ring-[#00a884]"
              />
              <div>
                <p className="text-white text-sm">Save with metadata</p>
                <p className="text-white/60 text-xs">Include date, time, and source info</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#00a884] focus:ring-[#00a884]"
              />
              <div>
                <p className="text-white text-sm">Auto-sync to cloud</p>
                <p className="text-white/60 text-xs">Backup saved statuses automatically</p>
              </div>
            </label>
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Folder className="text-white/60 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white text-sm font-medium">About Saving</p>
                <ul className="text-white/60 text-xs mt-2 space-y-1">
                  <li>• Saved statuses won't expire</li>
                  <li>• Access them anytime from your collection</li>
                  <li>• Share saved statuses with others</li>
                  <li>• Organize with custom folders</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20 space-y-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <Bookmark size={20} />
            Save Status
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusSavePanel;
