import { useState, useEffect } from 'react';
import { Plus, X, Eye, Clock, Camera, Image, Type, Upload, RefreshCw, Film, Sparkles, Bookmark } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import StatusScrollFeed from '../components/StatusScrollFeed';
import StatusReel from '../components/StatusReel';
import StoryHighlights from '../components/StoryHighlights';

const Status = () => {
  const { statuses, fetchStatuses, createStatus, uploadStatusMedia, user, contacts } = useChat();
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showScrollFeed, setShowScrollFeed] = useState(false);
  const [showReel, setShowReel] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [feedStartId, setFeedStartId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadData, setUploadData] = useState({
    type: 'text',
    caption: '',
    backgroundColor: '#1f2937',
    fontColor: '#ffffff',
    privacy: 'contacts',
    excludedViewers: [],
    file: null
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchStatuses();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStatuses]);

  const handleAddStatus = async () => {
    if (uploadData.type === 'text' && !uploadData.caption.trim()) {
      setError('Please enter a text for your status');
      return;
    }

    if (uploadData.type !== 'text' && !uploadData.file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError('');

      let mediaUrl = '';
      let mediaType = uploadData.type;

      if (uploadData.type !== 'text' && uploadData.file) {
        const up = await uploadStatusMedia(uploadData.file);
        mediaUrl = up.fileUrl || '';
        mediaType = up.mediaType || uploadData.type;
      }

      const privacy =
        uploadData.privacy === 'private' ? 'only_me' : uploadData.privacy;

      const text = uploadData.caption.trim();
      const payload = {
        type: uploadData.type,
        content: uploadData.type === 'text' ? text : (text || ' '),
        mediaUrl,
        mediaType,
        caption: uploadData.caption || '',
        backgroundColor: uploadData.backgroundColor,
        textColor: uploadData.fontColor,
        privacy,
        excludedViewers: privacy === 'contacts_except' ? uploadData.excludedViewers : []
      };

      const data = await createStatus(payload);
      if (!data.success) {
        throw new Error(data.message || 'Failed to create status');
      }

      setUploadData({
        type: 'text',
        caption: '',
        backgroundColor: '#1f2937',
        fontColor: '#ffffff',
        privacy: 'contacts',
        excludedViewers: [],
        file: null
      });
      setShowAddStatus(false);
      setSuccess('Status uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchStatuses();
    } catch (err) {
      console.error('Error uploading status:', err);
      setError(err.message || 'Failed to upload status');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadData((prev) => {
      let type = prev.type;
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      return { ...prev, file, type };
    });
  };

  const statusTime = (s) => {
    const t = s.timestamp || s.createdAt;
    if (!t) return '';
    try {
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden font-sans" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2440 50%, #0a1628 100%)' }}>
      <div className="w-full h-full md:w-[98%] md:h-[96%] bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col border border-white/10 rounded-2xl">
        <div className="bg-blue-900/50 backdrop-blur-xl text-white p-4 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg"
              title="Status Reel Mode" aria-label="Status Reel Mode"
            >
              <Film size={16} /> Reel
            </button>
            <button
              type="button"
              onClick={() => setShowHighlights(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg"
              title="Story Highlights" aria-label="Story Highlights"
            >
              <Bookmark size={16} /> Highlights
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await fetchStatuses();
                setLoading(false);
              }}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
             aria-label="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAddStatus(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
           aria-label="Add">
            <Plus size={24} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowAddStatus(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowAddStatus(true)}
          className="p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg">
              <Plus size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">My Status</p>
              <p className="text-sm text-blue-300">Tap to add status update</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p>Loading statuses...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm text-gray-400">Recent updates</h2>
                {statuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedStartId(null);
                      setShowScrollFeed(true);
                    }}
                    className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
              {statuses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No recent status updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(statuses || []).map((status) => {
                    const sid = status._id || status.id;
                    return (
                      <div
                        key={sid}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-4 p-3 bg-white/5 backdrop-blur-md rounded-lg shadow hover:bg-white/10 transition-shadow cursor-pointer border border-white/10"
                        onClick={() => {
                          setFeedStartId(sid);
                          setShowScrollFeed(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setFeedStartId(sid);
                            setShowScrollFeed(true);
                          }
                        }}
                      >
                        <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold border border-white/20">
                          {status.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white">{status.username || 'Unknown'}</p>
                          <p className="text-sm text-gray-400 truncate">{status.content || status.caption || status.type}</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm flex-shrink-0">
                          <Clock size={14} />
                          <span>{statusTime(status)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {showAddStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-96 max-w-[90%] p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Status</h3>
                <button type="button" onClick={() => setShowAddStatus(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Close">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
                    { value: 'image', icon: <Image className="w-4 h-4" />, label: 'Image' },
                    { value: 'video', icon: <Camera className="w-4 h-4" />, label: 'Video' },
                    { value: 'audio', icon: <Type className="w-4 h-4" />, label: 'Audio' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setUploadData((prev) => ({ ...prev, type: type.value }))}
                      className={`p-2 rounded-lg border transition-colors ${uploadData.type === type.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        {type.icon}
                        <span className="text-xs">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {uploadData.type !== 'text' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload File
                  </label>
                  <input
                    type="file"
                    accept={uploadData.type === 'image' ? 'image/*' : uploadData.type === 'video' ? 'video/*' : 'audio/*'}
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {(uploadData.type === 'text' || uploadData.file) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Caption
                  </label>
                  <textarea
                    value={uploadData.caption}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, caption: e.target.value }))}
                    placeholder={uploadData.type === 'text' ? 'Type your status message...' : 'Add a caption...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
              )}

              {uploadData.type === 'text' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={uploadData.backgroundColor}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Color
                    </label>
                    <input
                      type="color"
                      value={uploadData.fontColor}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, fontColor: e.target.value }))}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Privacy
                </label>
                <select
                  value={uploadData.privacy}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, privacy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="contacts">My Contacts</option>
                  <option value="contacts_except">My Contacts Except...</option>
                  <option value="everyone">Everyone</option>
                  <option value="private">Only me</option>
                </select>

                {/* FEATURE ADD: WhatsApp-style "hide my status from..." picker.
                    Anyone checked here won't be able to see this status even
                    though they're a contact. */}
                {uploadData.privacy === 'contacts_except' && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
                    {(contacts || []).length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-2 text-center">No contacts yet</p>
                    )}
                    {(contacts || []).map((c) => {
                      const cid = String(c.user?._id || c.user || c._id || c.id);
                      const checked = uploadData.excludedViewers.includes(cid);
                      return (
                        <label key={cid} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setUploadData((prev) => ({
                              ...prev,
                              excludedViewers: checked
                                ? prev.excludedViewers.filter((id) => id !== cid)
                                : [...prev.excludedViewers, cid]
                            }))}
                          />
                          {c.user?.username || c.username || c.name || 'Contact'}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddStatus(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddStatus}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Post Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showScrollFeed && (
          <StatusScrollFeed
            statuses={statuses}
            onClose={() => {
              setShowScrollFeed(false);
              setFeedStartId(null);
            }}
            currentUserId={user?._id || user?.id || 'local-user'}
            initialStatusId={feedStartId}
          />
        )}

        {/* Status Reel — Instagram/TikTok Style */}
        {showReel && (
          <StatusReel
            initialStatuses={statuses}
            onClose={() => setShowReel(false)}
          />
        )}

        {/* Story Highlights */}
        {showHighlights && (
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold flex items-center gap-2">
                <Bookmark size={18} className="text-yellow-400" /> Story Highlights
              </span>
              <button onClick={() => setShowHighlights(false)} className="text-white/60 hover:text-white p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StoryHighlights statuses={statuses} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Status;
