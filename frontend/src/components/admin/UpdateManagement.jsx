import React, { useState, useEffect, useCallback } from 'react';
import { Upload, RefreshCw, CheckCircle2, XCircle, Smartphone, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';

const UpdateManagement = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ version: '', versionCode: '', changelog: '', mandatory: false, downloadUrl: '' });

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/updates/stats');
      setUpdates(res.data?.updates || []);
    } catch (err) {
      console.error('Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.version || !form.versionCode || !form.changelog) {
      toast.error('Version, versionCode, and changelog are required');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('version', form.version);
      formData.append('versionCode', form.versionCode);
      formData.append('changelog', form.changelog);
      formData.append('mandatory', String(form.mandatory));
      if (form.downloadUrl) formData.append('downloadUrl', form.downloadUrl);

      await adminApi.post('/updates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Update v${form.version} uploaded! All users will be notified.`);
      setForm({ version: '', versionCode: '', changelog: '', mandatory: false, downloadUrl: '' });
      fetchUpdates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="text-emerald-600" size={24} />
        <div>
          <h2 className="text-xl font-bold">App Update Management</h2>
          <p className="text-gray-500 text-sm">Upload new APK versions and notify all users</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Upload size={18} /> Upload New Version
        </h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version (e.g. 1.2.0)</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm(f => ({ ...f, version: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                placeholder="1.2.0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version Code (integer)</label>
              <input
                type="number"
                value={form.versionCode}
                onChange={(e) => setForm(f => ({ ...f, versionCode: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                placeholder="32"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Changelog</label>
            <textarea
              value={form.changelog}
              onChange={(e) => setForm(f => ({ ...f, changelog: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              rows={3}
              placeholder="What's new in this version..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Download URL (optional — defaults to public APK)</label>
            <input
              type="url"
              value={form.downloadUrl}
              onChange={(e) => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              placeholder="https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mandatory"
              checked={form.mandatory}
              onChange={(e) => setForm(f => ({ ...f, mandatory: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="mandatory" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <AlertTriangle size={14} className="text-orange-500" />
              Mandatory update (users cannot dismiss)
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload & Notify All Users'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} /> Update History
        </h3>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : updates.length === 0 ? (
          <p className="text-gray-500 text-sm">No updates uploaded yet. Use the form above to publish your first update.</p>
        ) : (
          <div className="space-y-3">
            {updates.map((u) => (
              <div key={u._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">v{u.version}</span>
                    <span className="text-xs text-gray-400">code {u.versionCode}</span>
                    {u.mandatory && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">MANDATORY</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{u.changelog}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {u.uploadedBy?.username || 'Admin'} · {new Date(u.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateManagement;
