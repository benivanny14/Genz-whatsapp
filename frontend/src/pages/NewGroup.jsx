import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI, mediaAPI } from '../services/api';
import { ArrowLeft, Search, Users, Check, Camera, X, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';

// WhatsApp-style "New Group" flow — matches the colors/spacing used across
// GroupInfo.jsx, ContactPickerModal.jsx and the rest of the chat UI
// (#0b141a / #111b21 / #202c33 / #2a3942 / #00a884) so the experience is
// consistent before, during, and after creating a group.

const NewGroup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Select contacts, 2: Group info
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupIconPreview, setGroupIconPreview] = useState(null);
  const [groupIconFile, setGroupIconFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { selectConversation } = useChat();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length >= 1) {
        setLoading(true);
        try {
          const response = await chatAPI.searchUsers(searchQuery);
          setUsers(response.data.users || []);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setUsers([]);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) {
        return prev.filter((u) => u._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    setGroupIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setGroupIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreateGroup = async () => {
    setError('');
    if (selectedUsers.length < 1) {
      setError('Select at least 1 participant');
      return;
    }
    if (!groupName.trim()) {
      setError('Enter a group name');
      return;
    }

    setCreating(true);
    try {
      const participantIds = selectedUsers.map((u) => u._id);
      const response = await chatAPI.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        participants: participantIds,
      });

      const conv = response?.data?.conversation;
      if (!conv) {
        setError('Group created but could not be opened. Please refresh.');
        navigate('/chat');
        return;
      }

      // Upload group icon (best-effort, group still works without it)
      if (groupIconFile) {
        try {
          const uploadRes = await mediaAPI.uploadFile(groupIconFile);
          const fileUrl = uploadRes?.data?.fileUrl;
          if (fileUrl) {
            const updateRes = await chatAPI.updateGroupInfo(conv._id, { groupPhoto: fileUrl });
            if (updateRes?.data?.conversation) {
              conv.groupPhoto = fileUrl;
            }
          }
        } catch (err) {
          console.error('Group icon upload failed (non-fatal):', err);
        }
      }

      selectConversation(conv);
      navigate('/chat');
    } catch (err) {
      console.error('Failed to create group:', err);
      setError(err?.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="h-screen bg-[#0b141a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#202c33] flex-shrink-0">
        <button onClick={goBack} className="text-[#aebac1] hover:text-white p-1" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-white font-semibold text-base">
            {step === 1 ? 'Add group participants' : 'New group'}
          </h1>
          {step === 1 && (
            <p className="text-[#8696a0] text-xs">
              {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Search for people to add'}
            </p>
          )}
        </div>
      </div>

      {/* STEP 1: select participants */}
      {step === 1 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-3 bg-[#111b21] flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#202c33] rounded-lg px-3 py-2.5">
              <Search size={16} className="text-[#8696a0]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or number"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#8696a0]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#8696a0] hover:text-white" aria-label="Close">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Selected chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-[#111b21] flex-shrink-0 border-b border-white/5">
              {selectedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-1.5 bg-[#2a3942] text-white pl-1 pr-2 py-1 rounded-full"
                >
                  <div className="w-6 h-6 rounded-full bg-[#00a884]/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold">{(user.username || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs">{user.username}</span>
                  <button onClick={() => toggleUser(user)} className="hover:text-red-400" aria-label="Close">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={26} className="text-[#00a884] animate-spin" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => {
                const isSelected = !!selectedUsers.find((u) => u._id === user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {(user.username || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-medium truncate">{user.username}</p>
                      <p className="text-[#8696a0] text-xs truncate">{user.about || user.phoneNumber || 'Hey there! I am using GenZ WhatsApp'}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-[#8696a0]'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                );
              })
            ) : searchQuery.trim().length >= 1 ? (
              <div className="text-center py-10">
                <p className="text-[#8696a0] text-sm">No users found</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-[#8696a0]">
                <Users size={40} className="mb-3 opacity-40" />
                <p className="text-sm">Start typing to find people</p>
              </div>
            )}
          </div>

          {/* Next button (floating, WhatsApp-style) */}
          {selectedUsers.length > 0 && (
            <div className="flex-shrink-0 flex justify-end px-5 py-4">
              <button
                onClick={() => setStep(2)}
                className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-white flex items-center justify-center shadow-lg transition-colors"
                title="Next" aria-label="Next"
              >
                <Check size={22} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: group info */}
      {step === 2 && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center pt-8 pb-2 px-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center">
                {groupIconPreview ? (
                  <img src={groupIconPreview} alt="Group icon" className="w-full h-full object-cover" />
                ) : (
                  <Users size={42} className="text-[#aebac1]" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#00a884] hover:bg-[#06cf9c] rounded-full p-2.5 transition-colors"
               aria-label="Camera">
                <Camera size={16} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            <div className="w-full max-w-sm mt-6 space-y-4">
              <div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="w-full bg-transparent text-white text-lg border-b-2 border-[#00a884] outline-none pb-2 placeholder:text-[#8696a0]"
                  placeholder="Group name"
                />
              </div>
              <div>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full bg-[#202c33] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-[#00a884] resize-none placeholder:text-[#8696a0]"
                  placeholder="Group description (optional)"
                />
              </div>
            </div>
          </div>

          <p className="text-[#8696a0] text-xs px-5 pt-4 pb-2">
            Participants: {selectedUsers.length}
          </p>
          <div className="px-5 flex flex-wrap gap-2 pb-4">
            {selectedUsers.map((user) => (
              <span key={user._id} className="px-3 py-1 bg-[#00a884]/20 text-[#00a884] rounded-full text-xs">
                {user.username}
              </span>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center px-5 pb-2">{error}</p>
          )}

          <div className="flex justify-end px-5 py-4">
            <button
              onClick={handleCreateGroup}
              disabled={creating || selectedUsers.length < 1 || !groupName.trim()}
              className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg transition-colors"
              title="Create group" aria-label="Create group"
            >
              {creating ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewGroup;
