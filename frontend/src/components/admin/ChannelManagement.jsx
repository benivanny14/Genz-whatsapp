import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, BadgeCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, Pager } from './adminUi';

const ChannelManagement = () => {
  const [channels, setChannels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/channels', { params: { page, limit: 20 } });
      setChannels(data.channels || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const toggleVerify = async (c) => {
    try {
      await adminApi.patch(`/admin/channels/${c._id}/verify`);
      toast.success('Updated');
      load(pagination.page);
    } catch {
      toast.error('Failed to update channel');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this channel permanently?')) return;
    try {
      await adminApi.delete(`/admin/channels/${id}`);
      toast.success('Deleted');
      load(pagination.page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const viewPosts = async (c) => {
    try {
      const { data } = await adminApi.get(`/admin/channels/${c._id}/posts`);
      setPosts({ channel: c, items: data.posts || [] });
    } catch {
      toast.error('Failed to load posts');
    }
  };

  const removePost = async (postId) => {
    try {
      await adminApi.delete(`/admin/channels/${posts.channel._id}/posts/${postId}`);
      toast.success('Chapisho limeondolewa');
      viewPosts(posts.channel);
    } catch {
      toast.error('Failed to remove post');
    }
  };

  if (posts) {
    return (
      <div className="space-y-3">
        <button onClick={() => setPosts(null)} className="text-sm text-emerald-600">← Back to list</button>
        <h3 className="font-medium">{posts.channel.name} — Posts</h3>
        <div className="space-y-2">
          {posts.items.map((p) => (
            <div key={p._id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex justify-between items-start">
              <div className="text-sm">
                <p>{p.content}</p>
                <p className="text-gray-400 text-xs mt-1">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => removePost(p._id)} className="text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
          {posts.items.length === 0 && <p className="text-gray-400 text-sm">No posts</p>}
        </div>
      </div>
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      <Table headers={['Name', 'Owner', 'Followers', 'Verified', 'Action']}>
        {channels.map((c) => (
          <tr key={c._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{c.name}</td>
            <td className="p-3 text-gray-400">{c.owner?.username}</td>
            <td className="p-3">{c.followersCount}</td>
            <td className="p-3">{c.verified ? <BadgeCheck className="text-blue-500" size={16} /> : '—'}</td>
            <td className="p-3 flex gap-3">
              <button onClick={() => viewPosts(c)} className="text-blue-500"><FileText size={16} /></button>
              <button onClick={() => toggleVerify(c)} className="text-emerald-500 text-xs">{c.verified ? 'Unverify' : 'Verify'}</button>
              <button onClick={() => remove(c._id)} className="text-red-500"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
        {channels.length === 0 && <EmptyRow colSpan={5} />}
      </Table>
      <Pager page={pagination.page} pages={pagination.pages} onChange={load} />
    </div>
  );
};

export default ChannelManagement;
