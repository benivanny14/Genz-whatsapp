import React, { useState, useContext } from 'react';
import { ChatContext } from '../context/ChatContext';

const AddContactModal = ({ isOpen, onClose }) => {
  const { addContact } = useContext(ChatContext);
  const [phone, setPhone] = useState('');
  const [savedName, setSavedName] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', text: '' });

    const response = await addContact(phone, savedName);
    
    if (response.success) {
      setStatus({ type: 'success', text: response.message });
      setPhone('');
      setSavedName('');
      setTimeout(() => { onClose(); setStatus({ type: '', text: '' }); }, 1500);
    } else {
      setStatus({ type: 'error', text: response.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl text-white">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          👤 Add New Contact
        </h3>
        
        {status.text && (
          <div className={`p-3 rounded-lg text-sm mb-4 font-medium ${status.type === 'success' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-red-600/30 text-red-400 border border-red-500/40'}`}>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Jina la kumsave nalo</label>
            <input 
              type="text" 
              required
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="Mfano: Benny Mdogo"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Namba ya Simu</label>
            <input 
              type="text" 
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="Mfano: 0712345678"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-sm font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all text-sm font-medium shadow-lg shadow-emerald-900/20">
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
