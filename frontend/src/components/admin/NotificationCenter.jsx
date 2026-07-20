import React, { useState, useEffect } from 'react';
import { BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { StatCard, LoadingBlock } from './adminUi';

const NotificationCenter = () => {
  const [overview, setOverview] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminApi.get('/admin/notifications/overview')
      .then(({ data }) => setOverview(data.overview))
      .catch(() => toast.error('Imeshindikana kupakua takwimu'));
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await adminApi.post('/admin/notifications/send', { title, body, segment });
      toast.success('Arifa imetumwa');
      setTitle(''); setBody('');
    } catch {
      toast.error('Imeshindwa kutuma arifa');
    } finally {
      setSending(false);
    }
  };

  if (!overview) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Subscriptions Zote" value={overview.totalSubscriptions} />
        <StatCard label="Zinazofanya Kazi" value={overview.enabledSubscriptions} tone="emerald" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3">Tuma Push Notification</h3>
        <form onSubmit={send} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kichwa cha habari"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Maudhui ya arifa"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm" />
          <div className="flex gap-3 items-center">
            <select value={segment} onChange={(e) => setSegment(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
              <option value="all">Watumiaji wote</option>
              <option value="premium">Premium tu</option>
              <option value="free">Wasio Premium</option>
            </select>
            <button disabled={sending} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
              <BellRing size={14} /> {sending ? 'Inatuma...' : 'Tuma Arifa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationCenter;
