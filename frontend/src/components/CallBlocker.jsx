import React, { useState } from 'react';
import { X, PhoneOff, Shield, Users, Plus, Trash2, BellOff, UserCheck } from 'lucide-react';

const CallBlocker = ({ blockedNumbers = [], onBlock, onUnblock, onClose }) => {
  const [newNumber, setNewNumber] = useState('');
  const [blockUnknown, setBlockUnknown] = useState(() => {
    return localStorage.getItem('genz_block_unknown_calls') === 'true';
  });

  const handleBlock = () => {
    const num = newNumber.trim();
    if (!num) return;
    onBlock?.(num);
    setNewNumber('');
  };

  const handleToggleUnknown = () => {
    const next = !blockUnknown;
    setBlockUnknown(next);
    localStorage.setItem('genz_block_unknown_calls', String(next));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Shield size={18} className="text-red-400" /> Call Blocking
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Block Unknown Callers Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <BellOff size={18} className="text-gray-400" />
            <div>
              <p className="text-white text-sm font-semibold">Silence Unknown Callers</p>
              <p className="text-gray-400 text-xs">Calls from unknown numbers won't ring</p>
            </div>
          </div>
          <button
            onClick={handleToggleUnknown}
            className={`relative w-10 h-5 rounded-full transition-colors ${blockUnknown ? 'bg-[#00a884]' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${blockUnknown ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Add Number to Block */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="Enter phone number..."
            className="flex-1 bg-[#0b141a] text-white border border-white/10 rounded-lg p-2.5 text-sm focus:border-[#00a884] outline-none"
          />
          <button
            onClick={handleBlock}
            disabled={!newNumber.trim()}
            className="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-bold"
          >
            <Plus size={16} /> Block
          </button>
        </div>

        {/* Blocked Numbers List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(!blockedNumbers || blockedNumbers.length === 0) ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
              No numbers blocked yet
            </div>
          ) : (
            blockedNumbers.map((num, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <PhoneOff size={16} className="text-red-400" />
                  <span className="text-white text-sm">{num}</span>
                </div>
                <button
                  onClick={() => onUnblock?.(num)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CallBlocker;
