import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Edit, Type, Palette, Image, Video, Music, MapPin, Save, Trash2, RotateCcw } from 'lucide-react';

const StatusEditPanel = ({ onClose, status, onStatusUpdate }) => {
  const [editedStatus, setEditedStatus] = useState({
    content: '',
    caption: '',
    backgroundColor: '#1f2937',
    fontColor: '#ffffff',
    privacy: 'contacts',
    mediaUrl: '',
    type: 'text'
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status) {
      setEditedStatus({
        content: status.content || '',
        caption: status.caption || '',
        backgroundColor: status.backgroundColor || '#1f2937',
        fontColor: status.fontColor || '#ffffff',
        privacy: status.privacy || 'contacts',
        mediaUrl: status.mediaUrl || '',
        type: status.type || 'text'
      });
    }
  }, [status]);

  const handleChange = (field, value) => {
    setEditedStatus({ ...editedStatus, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status/${status?._id || status?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedStatus)
      });

      const data = await response.json();
      if (data.success) {
        if (onStatusUpdate) {
          onStatusUpdate(editedStatus);
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

  const handleReset = () => {
    if (status) {
      setEditedStatus({
        content: status.content || '',
        caption: status.caption || '',
        backgroundColor: status.backgroundColor || '#1f2937',
        fontColor: status.fontColor || '#ffffff',
        privacy: status.privacy || 'contacts',
        mediaUrl: status.mediaUrl || '',
        type: status.type || 'text'
      });
      setHasChanges(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this status?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${resolveApiBase()}/status/${status?._id || status?.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (onStatusUpdate) {
          onStatusUpdate({ action: 'delete', id: status._id || status.id });
        }
        onClose();
      } catch (error) {
        console.error('Error deleting status:', error);
        alert('Failed to delete status. Please try again.');
      }
    }
  };

  const colors = [
    '#1f2937', '#075E54', '#128C7E', '#25D366', '#34B7F1',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF69B4', '#FFD700', '#FF4500', '#800080'
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Edit className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Edit Status</h2>
              <p className="text-white/60 text-xs">Modify your status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Content */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Content</label>
            <textarea
              value={editedStatus.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Status content..."
              rows={3}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Caption</label>
            <input
              type="text"
              value={editedStatus.caption}
              onChange={(e) => handleChange('caption', e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Background Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleChange('backgroundColor', color)}
                  className={`w-10 h-10 rounded-xl transition-colors ${
                    editedStatus.backgroundColor === color ? 'ring-2 ring-[#00a884]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Font Color */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Font Color</label>
            <div className="flex gap-2">
              {['#ffffff', '#000000', '#FF6B6B', '#4ECDC4', '#FFD700'].map((color) => (
                <button
                  key={color}
                  onClick={() => handleChange('fontColor', color)}
                  className={`w-10 h-10 rounded-xl transition-colors ${
                    editedStatus.fontColor === color ? 'ring-2 ring-[#00a884]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Privacy</label>
            <select
              value={editedStatus.privacy}
              onChange={(e) => handleChange('privacy', e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              <option value="contacts" className="bg-[#1a2e35]">My Contacts</option>
              <option value="public" className="bg-[#1a2e35]">Public</option>
              <option value="private" className="bg-[#1a2e35]">Private</option>
              <option value="except" className="bg-[#1a2e35]">Contacts Except...</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Preview</p>
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: editedStatus.backgroundColor,
                color: editedStatus.fontColor
              }}
            >
              <p className="font-medium">{editedStatus.content || 'Your status content'}</p>
              {editedStatus.caption && (
                <p className="text-sm mt-2 opacity-80">{editedStatus.caption}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reset
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-4 00 font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusEditPanel;
