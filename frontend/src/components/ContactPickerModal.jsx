import { useState, useEffect } from 'react';
import { Search, X, User, Phone, Check } from 'lucide-react';
import { chatAPI } from '../services/api';

const ContactPickerModal = ({ onClose, onSelect, title = 'Share Contact' }) => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatAPI.getContacts().then(res => {
      // Backend returns contacts as [{ user: {...}, savedName }] — flatten
      // into plain user objects (keeping savedName as a display override)
      // so the list below (which reads c._id, c.username, etc.) works.
      const raw = res?.data?.contacts || [];
      const flattened = raw
        .map(c => (c && c.user ? { ...c.user, savedName: c.savedName } : c))
        .filter(c => c && c._id);
      setContacts(flattened);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c =>
    (c.savedName || c.username || c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phoneNumber || c.phone || '').includes(search)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}>
      <div className="bg-[#111b21] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942]">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>
        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
            <Search size={16} className="text-[#8696a0]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..." autoFocus
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-[#8696a0]" />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="text-center py-8 text-[#8696a0]">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-[#8696a0]">No contacts found</div>
          ) : filtered.map(c => (
            <div key={c._id}
              onClick={() => setSelected(c._id === selected?._id ? null : c)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors
                ${selected?._id === c._id ? 'bg-[#00a884]/20' : 'hover:bg-[#2a3942]'}`}>
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.profilePicture
                  ? <img src={c.profilePicture} alt="" className="w-full h-full object-cover" />
                  : <User size={20} className="text-[#8696a0]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{c.savedName || c.username || c.name}</p>
                <p className="text-[#8696a0] text-xs flex items-center gap-1">
                  <Phone size={10} />{c.phoneNumber || c.phone || 'No number'}
                </p>
              </div>
              {selected?._id === c._id && <Check size={18} className="text-[#00a884] flex-shrink-0" />}
            </div>
          ))}
        </div>
        {/* Send button */}
        <div className="px-4 py-3 border-t border-[#2a3942]">
          <button
            onClick={() => { if (selected) { onSelect(selected); onClose(); } }}
            disabled={!selected}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-colors
              ${selected ? 'bg-[#00a884] hover:bg-[#008f6f]' : 'bg-[#2a3942] cursor-not-allowed text-[#8696a0]'}`}>
            Share Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactPickerModal;
