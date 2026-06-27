import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import {
  ArrowLeft,
  Users,
  Image as ImageIcon,
  Shield,
  Trash2,
  UserPlus,
  Link as LinkIcon,
  Bell,
  Clock,
  Search,
  Check,
  X,
  Edit2,
  UserMinus,
  MessageSquare
} from 'lucide-react';
import { formatConversationTime } from '../utils/formatDate';
import ContactPickerModal from './ContactPickerModal';

const formatDisappearingLabel = (settings) => {
  if (!settings?.enabled) return 'Off';
  const duration = settings.duration;
  if (duration === '24h') return 'On • 24 hours';
  if (duration === '7d') return 'On • 7 days';
  if (duration === '90d') return 'On • 90 days';
  if (typeof duration === 'number') return `On • ${duration} hours`;
  if (typeof duration === 'string' && duration.endsWith('h')) return `On • ${duration.replace('h', ' hours')}`;
  return `On • ${duration || '24h'}`;
};

const GroupInfo = ({ group, onClose, currentUserId }) => {
  const { getGroupInfo, updateGroupInfo, removeAdmin, makeAdmin, addParticipant, removeParticipant, leaveGroup, updateGroupPermission, regenerateGroupInvite } = useChat();
  const [info, setInfo] = useState(group);
  const [loading, setLoading] = useState(true);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberBusy, setAddMemberBusy] = useState(false);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(group?.groupName || '');
  const [editDesc, setEditDesc] = useState(group?.groupDescription || '');
  const [saving, setSaving] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const res = await getGroupInfo(group._id);
        if (res.success && mounted) {
          setInfo(res.data);
          setEditName(res.data.groupName || '');
          setEditDesc(res.data.groupDescription || '');
        }
      } catch (e) {
        console.error('Fetch group error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (group?._id) fetchInfo();
    return () => { mounted = false; };
  }, [group?._id, getGroupInfo]);

  const sameId = (a, b) => String(a?._id || a || '') === String(b?._id || b || '');
  const isAdmin = info?.admins?.some(admin => sameId(admin, currentUserId));
  const creatorId = info?.createdBy?._id || info?.createdBy;

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await updateGroupInfo(group._id, { groupName: editName, groupDescription: editDesc });
      if (res.success) {
        setInfo(prev => ({ ...prev, groupName: editName, groupDescription: editDesc }));
        setEditMode(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await removeParticipant(group._id, memberId);
      setInfo(prev => ({ ...prev, participants: prev.participants.filter(p => !sameId(p._id, memberId)) }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async (contact) => {
    if (!contact?._id) return;
    const alreadyMember = info?.participants?.some(p => sameId(p._id, contact._id));
    if (alreadyMember) {
      alert(`${contact.username || contact.name} is already in this group`);
      return;
    }
    setAddMemberBusy(true);
    try {
      const result = await addParticipant(group._id, contact._id);
      if (result?.success === false) {
        alert(result.message || 'Could not add member');
        return;
      }
      setInfo(prev => ({ ...prev, participants: [...(prev.participants || []), contact] }));
    } catch (e) {
      console.error(e);
      alert('Could not add member');
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleMakeAdmin = async (memberId) => {
    if (!window.confirm('Make this member an admin?')) return;
    try {
      await makeAdmin(group._id, memberId);
      setInfo(prev => ({ ...prev, admins: [...prev.admins, memberId] }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveAdminRole = async (memberId) => {
    if (!window.confirm('Remove admin role?')) return;
    try {
      await removeAdmin(group._id, memberId);
      setInfo(prev => ({ ...prev, admins: prev.admins.filter(a => !sameId(a, memberId)) }));
    } catch (e) {
      console.error(e);
    }
  };

  const SectionRow = ({ icon: Icon, iconColor, label, value, onClick, rightElement, className = '' }) => (
    <div
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors text-left ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {Icon && <Icon size={20} className={iconColor || 'text-white/50'} />}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm">{label}</span>
        {value && <p className="text-white/50 text-xs mt-0.5 truncate">{value}</p>}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
      className="absolute inset-y-0 right-0 z-[100] w-full sm:w-[400px] bg-[#111b21] flex flex-col border-l border-white/10 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#202c33] flex-shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-white" />
        </button>
        <h2 className="text-white font-semibold text-base">Group info</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Profile Info */}
            <div className="bg-[#111b21] pb-6 pt-6 flex flex-col items-center border-b-[8px] border-[#0b141a]">
              <div className="w-48 h-48 rounded-full overflow-hidden mb-4 border-2 border-white/10 cursor-pointer hover:opacity-90 relative group">
                <img
                  src={info?.groupPhoto || 'https://via.placeholder.com/200?text=Group'}
                  alt="Group avatar"
                  className="w-full h-full object-cover"
                />
                {isAdmin && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="text-white w-8 h-8" />
                  </div>
                )}
              </div>

              {!editMode ? (
                <>
                  <h2 className="text-white text-2xl font-normal text-center px-4 flex items-center gap-2">
                    {info?.groupName}
                    {isAdmin && (
                      <button onClick={() => setEditMode(true)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </h2>
                  <p className="text-white/50 mt-1">Group · {info?.participants?.length || 0} members</p>
                </>
              ) : (
                <div className="w-full px-6 space-y-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#202c33] text-white border-b border-[#00a884] focus:border-white p-2 outline-none"
                    placeholder="Group subject"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditMode(false)} className="px-3 py-1 rounded text-white/70 hover:bg-white/10">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-3 py-1 rounded bg-[#00a884] text-white">Save</button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-[#111b21] border-b-[8px] border-[#0b141a]">
              {!editMode ? (
                <SectionRow
                  label="Description"
                  value={info?.groupDescription || (isAdmin ? 'Add group description' : '')}
                  onClick={isAdmin ? () => setEditMode(true) : null}
                  className={isAdmin && !info?.groupDescription ? 'text-[#00a884]' : ''}
                />
              ) : (
                <div className="p-5">
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full bg-[#202c33] text-white rounded p-2 outline-none h-24 resize-none"
                    placeholder="Add group description"
                  />
                </div>
              )}
            </div>

            {/* Media/Links */}
            <div className="bg-[#111b21] border-b-[8px] border-[#0b141a]">
              <SectionRow
                label="Media, links, and docs"
                value="0"
                rightElement={<ChevronRight size={20} className="text-white/30" />}
                className="cursor-pointer"
              />
            </div>

            {/* Settings */}
            <div className="bg-[#111b21] border-b-[8px] border-[#0b141a]">
              <SectionRow icon={Bell} label="Mute notifications" rightElement={
                <div className="w-10 h-5 bg-[#00a884] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full" />
                </div>
              } />
              <SectionRow icon={Clock} label="Disappearing messages" value={formatDisappearingLabel(info?.disappearingMessages)} />

              {isAdmin && info?.groupInviteCode && (
                <>
                  <SectionRow
                    icon={LinkIcon}
                    label="Invite link"
                    value={info.groupInviteCode}
                    onClick={async () => {
                      const link = `${window.location.origin}/join/${group._id}/${info.groupInviteCode}`;
                      try {
                        await navigator.clipboard.writeText(link);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      } catch {
                        alert('Could not copy invite link');
                      }
                    }}
                    rightElement={
                      <span className="text-xs text-[#00a884]">{inviteCopied ? 'Copied!' : 'Copy link'}</span>
                    }
                  />
                  <SectionRow
                    icon={LinkIcon}
                    label="Regenerate invite code"
                    value="Invalidates the previous code"
                    onClick={async () => {
                      if (!window.confirm('Generate a new invite code? The old code will stop working.')) return;
                      setInviteBusy(true);
                      try {
                        const res = await regenerateGroupInvite(group._id);
                        if (res.success) {
                          setInfo((prev) => ({ ...prev, groupInviteCode: res.groupInviteCode }));
                        }
                      } finally {
                        setInviteBusy(false);
                      }
                    }}
                    rightElement={inviteBusy ? <span className="text-xs text-white/50">...</span> : null}
                  />
                </>
              )}
            </div>

            {/* Permissions */}
            {isAdmin && (
              <div className="bg-[#111b21] border-b-[8px] border-[#0b141a] py-2">
                <p className="px-5 text-[#00a884] text-sm mb-2">Group permissions</p>
                <SectionRow
                  label="Edit group settings"
                  rightElement={
                    <div onClick={() => updateGroupPermission(info?._id, 'canChangeGroupInfo', !info?.canChangeGroupInfo)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${info?.canChangeGroupInfo ? 'bg-[#00a884]' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${info?.canChangeGroupInfo ? 'right-1' : 'left-1'}`} />
                    </div>
                  }
                />
                <SectionRow
                  label="Send messages"
                  rightElement={
                    <div onClick={() => updateGroupPermission(info?._id, 'adminOnlyMessaging', !info?.adminOnlyMessaging)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${!info?.adminOnlyMessaging ? 'bg-[#00a884]' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${!info?.adminOnlyMessaging ? 'right-1' : 'left-1'}`} />
                    </div>
                  }
                />
              </div>
            )}

            {/* Participants */}
            <div className="bg-[#111b21] border-b-[8px] border-[#0b141a] pb-2">
              <div className="flex items-center justify-between px-5 py-3 text-[#00a884]">
                <span className="text-sm">{info?.participants?.length || 0} participants</span>
                <Search
                  size={18}
                  className="text-white/50 cursor-pointer hover:text-white"
                  onClick={() => {
                    setShowMemberSearch((prev) => !prev);
                    setMemberSearch('');
                  }}
                />
              </div>

              {showMemberSearch && (
                <div className="px-5 pb-2">
                  <input
                    autoFocus
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full bg-[#202c33] text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-white/40"
                  />
                </div>
              )}

              {isAdmin && (
                <SectionRow
                  icon={UserPlus}
                  label={<span className="text-white">Add members</span>}
                  onClick={() => setShowAddMembers(true)}
                />
              )}
              {isAdmin && (
                <SectionRow
                  icon={LinkIcon}
                  label={<span className="text-white">Invite to group via link</span>}
                  onClick={async () => {
                    if (!info?.groupInviteCode) {
                      alert('Open "Invite link" above first to generate a code.');
                      return;
                    }
                    const link = `${window.location.origin}/join/${group._id}/${info.groupInviteCode}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: info?.groupName || 'Join my group', url: link });
                        return;
                      } catch {
                        // user cancelled share sheet — fall through to clipboard copy
                      }
                    }
                    try {
                      await navigator.clipboard.writeText(link);
                      alert('Invite link copied to clipboard');
                    } catch {
                      alert(link);
                    }
                  }}
                />
              )}

              {info?.participants
                ?.filter(member =>
                  !memberSearch.trim() ||
                  (member.username || '').toLowerCase().includes(memberSearch.trim().toLowerCase())
                )
                ?.map(member => {
                const isMemberAdmin = info?.admins?.some(admin => sameId(admin, member._id));
                const isMe = sameId(member._id, currentUserId);

                return (
                  <div key={member._id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 group relative">
                    <img src={member.profilePicture || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-base">{isMe ? 'You' : member.username}</span>
                        {isMemberAdmin && <span className="text-[#00a884] text-xs border border-[#00a884] rounded px-1.5 py-0.5">Group Admin</span>}
                      </div>
                      <p className="text-white/50 text-xs truncate">{member.about || 'Available'}</p>
                    </div>

                    {/* Admin Actions Overlay */}
                    {isAdmin && !isMe && (
                      <div className="hidden group-hover:flex items-center gap-2 absolute right-5 bg-[#111b21] p-1 rounded-lg border border-white/10 shadow-lg">
                        <button className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded" title="Message">
                          <MessageSquare size={16} />
                        </button>
                        {!isMemberAdmin ? (
                          <button onClick={() => handleMakeAdmin(member._id)} className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded" title="Make Admin">
                            <Shield size={16} />
                          </button>
                        ) : (
                          <button onClick={() => handleRemoveAdminRole(member._id)} className="p-1.5 text-yellow-500 hover:bg-yellow-500/20 rounded" title="Dismiss Admin">
                            <Shield size={16} />
                          </button>
                        )}
                        <button onClick={() => handleRemoveMember(member._id)} className="p-1.5 text-red-500 hover:bg-red-500/20 rounded" title="Remove Member">
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="bg-[#111b21] py-2">
              <SectionRow
                icon={Trash2}
                iconColor="text-red-500"
                label={<span className="text-red-500">Exit group</span>}
                onClick={async () => {
                  if (!window.confirm('Exit this group?')) return;
                  const result = await leaveGroup(group._id);
                  if (result?.success === false) {
                    alert(result.message || 'Could not exit group');
                    return;
                  }
                  onClose?.();
                }}
              />
            </div>
          </>
        )}
      </div>

      {showAddMembers && (
        <ContactPickerModal
          title="Add to group"
          onClose={() => setShowAddMembers(false)}
          onSelect={handleAddMember}
        />
      )}
    </motion.div>
  );
};

export default GroupInfo;
