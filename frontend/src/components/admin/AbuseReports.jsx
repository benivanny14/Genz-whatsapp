import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, StatCard, Pager } from './adminUi';

const STATUS_COLORS = {
  pending: 'text-amber-500',
  under_review: 'text-blue-500',
  resolved: 'text-emerald-500',
  dismissed: 'text-gray-400'
};

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed'
};

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  urgent: 'text-red-500'
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

const CATEGORY_LABELS = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate Content',
  fake_account: 'Fake Account',
  scam: 'Scam',
  violence: 'Violence',
  hate_speech: 'Hate Speech',
  other: 'Other'
};

const CONTENT_TYPE_LABELS = {
  message: 'Message',
  conversation: 'Conversation',
  group: 'Group',
  channel: 'Channel',
  channel_post: 'Channel Post',
  status: 'Status',
  user_profile: 'User Profile',
  other: 'Other'
};

const AbuseReports = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const [{ data: listData }, { data: statsData }] = await Promise.all([
        adminApi.get('/admin/abuse-reports', { params }),
        adminApi.get('/admin/abuse-reports/stats')
      ]);
      setReports(listData.reports || []);
      setStats(statsData.stats);
      setPagination(listData.pagination);
    } catch {
      toast.error('Failed to load abuse reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => { load(1); }, [load]);

  const viewReport = async (report) => {
    try {
      const { data } = await adminApi.get(`/admin/abuse-reports/${report._id}`);
      setViewing(data.report);
    } catch {
      toast.error('Failed to download report');
    }
  };

  const updateStatus = async (status, actionTaken = 'none', adminNotes = '') => {
    if (!viewing) return;
    try {
      const { data } = await adminApi.patch(`/admin/abuse-reports/${viewing._id}/status`, {
        status,
        actionTaken,
        adminNotes
      });
      setViewing(data.report);
      toast.success('Updated');
      load(pagination.page);
    } catch {
      toast.error('Failed to update report');
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await adminApi.delete(`/admin/abuse-reports/${id}`);
      toast.success('Deleted');
      setViewing(null);
      load(pagination.page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (viewing) {
    return (
      <div className="space-y-4">
        <button onClick={() => setViewing(null)} className="text-sm text-emerald-600">← Back to list</button>
        
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium text-lg">Report #{viewing._id.toString().slice(-6)}</h3>
              <p className="text-xs text-gray-400">
                {new Date(viewing.createdAt).toLocaleString()} • 
                {CATEGORY_LABELS[viewing.category] || viewing.category}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[viewing.priority] || 'text-gray-400'} bg-gray-100 dark:bg-gray-800`}>
                {PRIORITY_LABELS[viewing.priority] || viewing.priority}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[viewing.status] || 'text-gray-400'} bg-gray-100 dark:bg-gray-800`}>
                {STATUS_LABELS[viewing.status] || viewing.status}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Reporter</p>
              <p className="font-medium">{viewing.reporterId?.username || '—'}</p>
              <p className="text-xs text-gray-400">{viewing.reporterId?.phoneNumber || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Reported User</p>
              <p className="font-medium">{viewing.reportedUserId?.username || '—'}</p>
              <p className="text-xs text-gray-400">{viewing.reportedUserId?.phoneNumber || '—'}</p>
              {viewing.reportedUserId?.isBlocked && <span className="text-xs text-red-500">(Blocked)</span>}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Content Type</p>
            <p className="font-medium">{CONTENT_TYPE_LABELS[viewing.contentType] || viewing.contentType}</p>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Details</p>
            <p className="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{viewing.description}</p>
          </div>

          {viewing.screenshots && viewing.screenshots.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1">Screenshots</p>
              <div className="flex gap-2">
                {viewing.screenshots.map((url, i) => (
                  <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {viewing.adminNotes && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1">Admin Notes</p>
              <p className="text-sm bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">{viewing.adminNotes}</p>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p className="text-xs text-gray-400 mb-2">Change Status</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => updateStatus('pending')} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                <Clock size={14} className="inline mr-1" /> Pending
              </button>
              <button onClick={() => updateStatus('under_review')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30">
                <Eye size={14} className="inline mr-1" /> Under Review
              </button>
              <button onClick={() => updateStatus('resolved', 'warning_sent')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/30">
                <CheckCircle size={14} className="inline mr-1" /> Resolved
              </button>
              <button onClick={() => updateStatus('dismissed')} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30">
                <XCircle size={14} className="inline mr-1" /> Dismissed
              </button>
            </div>

            <textarea
              placeholder="Write admin notes..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm mb-2"
              rows={2}
              defaultValue={viewing.adminNotes || ''}
              onBlur={(e) => updateStatus(viewing.status, viewing.actionTaken, e.target.value)}
            />

            <button onClick={() => deleteReport(viewing._id)} className="text-sm text-red-600 flex items-center gap-1">
              <Trash2 size={14} /> Delete Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} tone="amber" />
          <StatCard label="Under Review" value={stats.underReview} tone="blue" />
          <StatCard label="Resolved" value={stats.resolved} tone="emerald" />
          <StatCard label="Dismissed" value={stats.dismissed} tone="gray" />
          <StatCard label="Urgent" value={stats.byPriority?.urgent || 0} tone="red" />
          <StatCard label="High" value={stats.byPriority?.high || 0} tone="orange" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium">Chuja</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
            <option value="all">All Categories</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="inappropriate_content">Inappropriate Content</option>
            <option value="fake_account">Fake Account</option>
            <option value="scam">Scam</option>
            <option value="violence">Violence</option>
            <option value="hate_speech">Hate Speech</option>
            <option value="other">Other</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <Table headers ={['ID', 'Reporter', 'Reported', 'Category', 'Priority', 'Status', 'Submitted', 'Action']}>
        {reports.map((r) => (
          <tr key={r._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3 text-xs font-mono">#{r._id.toString().slice(-6)}</td>
            <td className="p-3">{r.reporterId?.username || '—'}</td>
            <td className="p-3">{r.reportedUserId?.username || '—'}</td>
            <td className="p-3 text-xs">{CATEGORY_LABELS[r.category] || r.category}</td>
            <td className={`p-3 text-xs ${PRIORITY_COLORS[r.priority] || 'text-gray-400'}`}>
              {PRIORITY_LABELS[r.priority] || r.priority}
            </td>
            <td className={`p-3 text-xs font-medium ${STATUS_COLORS[r.status] || 'text-gray-400'}`}>
              {STATUS_LABELS[r.status] || r.status}
            </td>
            <td className="p-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
            <td className="p-3">
              <button onClick={() => viewReport(r)} className="text-blue-500"><Eye size={16} /></button>
            </td>
          </tr>
        ))}
        {reports.length === 0 && <EmptyRow colSpan={8} text="No abuse reports" />}
      </Table>
      <Pager page={pagination.page} pages={pagination.pages} onChange={load} />
    </div>
  );
};

export default AbuseReports;
