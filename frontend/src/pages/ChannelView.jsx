import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Users, Send, Image as ImageIcon, Trash2, Heart, Eye, MoreVertical } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

// The Channels feed page — previously missing entirely. Followers land
// here to read a channel's posts (like a WhatsApp Channel); the owner can
// post updates from the same screen.
const ChannelView = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [menuPostId, setMenuPostId] = useState(null);
  const viewedRef = useRef(new Set());

  const loadChannel = useCallback(async () => {
    try {
      const res = await api.get(`/channels/${channelId}`);
      setChannel(res.data?.channel || null);
      setIsOwner(Boolean(res.data?.isOwner));
      setIsFollowing(Boolean(res.data?.isFollowing));
    } catch (e) {
      console.error('Failed to load channel', e);
    }
  }, [channelId]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/channels/${channelId}/posts`);
      setPosts(res.data?.posts || []);
    } catch (e) {
      console.error('Failed to load channel posts', e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadChannel();
    loadPosts();
  }, [loadChannel, loadPosts]);

  // Live updates while this feed is open.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channelId) return;

    socket.emit('join:channel', channelId);

    const onNewPost = (payload) => {
      if (String(payload.channelId) !== String(channelId)) return;
      setPosts((prev) => [payload.post, ...prev]);
    };
    const onPostDeleted = (payload) => {
      if (String(payload.channelId) !== String(channelId)) return;
      setPosts((prev) => prev.filter((p) => p._id !== payload.postId));
    };

    socket.on('channel:newPost', onNewPost);
    socket.on('channel:postDeleted', onPostDeleted);

    return () => {
      socket.emit('leave:channel', channelId);
      socket.off('channel:newPost', onNewPost);
      socket.off('channel:postDeleted', onPostDeleted);
    };
  }, [channelId]);

  // Mark visible posts as viewed (best-effort, once per post per session).
  useEffect(() => {
    posts.forEach((post) => {
      if (viewedRef.current.has(post._id)) return;
      viewedRef.current.add(post._id);
      api.post(`/channels/${channelId}/posts/${post._id}/view`).catch(() => {});
    });
  }, [posts, channelId]);

  const handleFollow = async () => {
    try {
      if (isFollowing) await api.delete(`/channels/${channelId}/follow`);
      else await api.post(`/channels/${channelId}/follow`);
      setIsFollowing((v) => !v);
      loadChannel();
    } catch (e) { console.error(e); }
  };

  const handlePost = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const res = await api.post(`/channels/${channelId}/posts`, { content: draft.trim() });
      setPosts((prev) => [res.data.post, ...prev]);
      setDraft('');
    } catch (e) {
      console.error('Failed to post', e);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (postId) => {
    setMenuPostId(null);
    try {
      await api.delete(`/channels/${channelId}/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (e) { console.error(e); }
  };

  const handleReact = async (postId) => {
    try {
      const res = await api.post(`/channels/${channelId}/posts/${postId}/react`, { emoji: '❤️' });
      setPosts((prev) => prev.map((p) => (
        p._id === postId
          ? { ...p, reactionsCount: res.data.reactionsCount, _reacted: res.data.reacted }
          : p
      )));
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100vh', overflow: 'hidden', background: '#0b141a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-[#2a3942]">
        <button onClick={() => navigate('/channels')} className="text-[#8696a0] hover:text-white transition-colors" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center flex-shrink-0 border border-[#37404a] overflow-hidden">
          {channel?.avatar ? <img src={channel.avatar} alt="" className="w-full h-full object-cover" /> : <Hash size={18} className="text-[#00a884]" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{channel?.name || 'Channel'}</p>
          <p className="text-[#8696a0] text-xs flex items-center gap-1">
            <Users size={10} />{(channel?.followersCount || 0).toLocaleString()} followers
          </p>
        </div>
        {!isOwner && (
          <button onClick={handleFollow}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border
              ${isFollowing ? 'border-[#37404a] text-[#8696a0] hover:border-red-400 hover:text-red-400' : 'border-[#00a884] text-[#00a884] hover:bg-[#00a884] hover:text-white'}`}>
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Feed */}
      <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }} className="px-3 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8">
            <Hash size={40} className="text-[#2a3942] mb-3" />
            <p className="text-[#8696a0] font-medium">No posts yet</p>
            <p className="text-[#8696a0] text-sm mt-1">
              {isOwner ? 'Share your first update below' : 'Check back later for updates'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="bg-[#202c33] rounded-xl p-4 relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden">
                    {post.author?.profilePicture
                      ? <img src={post.author.profilePicture} alt="" className="w-full h-full object-cover" />
                      : <Hash size={14} className="text-[#00a884]" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{channel?.name}</p>
                    <p className="text-[#8696a0] text-xs">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {isOwner && (
                  <div className="relative">
                    <button onClick={() => setMenuPostId(menuPostId === post._id ? null : post._id)}
                      className="text-[#8696a0] hover:text-white p-1" aria-label="More options">
                      <MoreVertical size={16} />
                    </button>
                    {menuPostId === post._id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#2a3942] rounded-lg shadow-xl overflow-hidden z-10 w-32">
                        <button onClick={() => handleDelete(post._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-[#3a4952] text-sm">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {post.content && <p className="text-white text-sm whitespace-pre-wrap mb-2">{post.content}</p>}
              {post.mediaUrl && post.mediaType === 'image' && (
                <img src={post.mediaUrl} alt="" className="rounded-lg w-full mb-2" />
              )}
              <div className="flex items-center gap-4 text-[#8696a0] text-xs mt-1">
                <span className="flex items-center gap-1"><Eye size={12} />{post.viewsCount || 0}</span>
                <button onClick={() => handleReact(post._id)} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                  <Heart size={12} className={post._reacted ? 'fill-red-400 text-red-400' : ''} />
                  {post.reactionsCount ?? (post.reactions?.length || 0)}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer — owner only */}
      {isOwner && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#202c33] border-t border-[#2a3942]">
          <button className="text-[#8696a0] hover:text-white p-2" title="Attach media (coming soon)" aria-label="Attach media (coming soon)">
            <ImageIcon size={20} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
            placeholder="Post an update..."
            maxLength={4000}
            className="flex-1 bg-[#2a3942] text-white text-sm px-3 py-2.5 rounded-lg outline-none placeholder-[#8696a0]"
          />
          <button onClick={handlePost} disabled={!draft.trim() || posting}
            className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white p-2.5 rounded-full transition-colors" aria-label="Send">
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChannelView;
