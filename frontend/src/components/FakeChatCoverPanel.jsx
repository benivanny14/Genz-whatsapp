import React, { useState, useEffect } from 'react';
import { Shield, X, RefreshCw, MessageCircle, Check, Trash2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/fake-chat`;

/**
 * FakeChatCoverPanel - Allows user to apply a pre-made conversation as a cover
 * on top of a real conversation. When applied, the real chat is hidden and
 * the fake conversation appears in the chat list instead.
 */
const FakeChatCoverPanel = ({ chatId, chatName, onClose }) => {
  const [premadeConversations, setPremadeConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentCover, setCurrentCover] = useState(null);

  // Load current cover for this chat from localStorage
  useEffect(() => {
    try {
      const covers = JSON.parse(localStorage.getItem('genz_fake_chat_covers') || '{}');
      if (covers[chatId]) {
        setCurrentCover(covers[chatId]);
      }
    } catch (e) {}
  }, [chatId]);

  // Fetch pre-made conversations
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE}/premade`);
        const data = await res.json();
        if (data?.success) setPremadeConversations(data.conversations || []);
      } catch (err) {
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply a fake chat cover to this conversation
  const applyCover = async (templateId) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const template = premadeConversations.find(c => c.id === templateId);
      if (!template) {
        setError('Conversation not found');
        return;
      }

      // Save cover mapping to localStorage
      const covers = JSON.parse(localStorage.getItem('genz_fake_chat_covers') || '{}');
      covers[chatId] = {
        templateId,
        contactName: template.contactName,
        contactPhone: template.contactPhone,
        category: template.category,
        appliedAt: new Date().toISOString()
      };
      localStorage.setItem('genz_fake_chat_covers', JSON.stringify(covers));

      setCurrentCover(covers[chatId]);
      setSuccess(`Cover applied! "${chatName}" now shows as "${template.contactName}"`);
    } catch (err) {
      setError('Failed to apply cover');
    } finally {
      setSaving(false);
    }
  };

  // Remove the cover from this conversation
  const removeCover = () => {
    const covers = JSON.parse(localStorage.getItem('genz_fake_chat_covers') || '{}');
    delete covers[chatId];
    localStorage.setItem('genz_fake_chat_covers', JSON.stringify(covers));
    setCurrentCover(null);
    setSuccess('Cover removed! Original chat will show again.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Shield size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Fake Chat Cover</h2>
              <p className="text-gray-400 text-xs">Hide "{chatName}" behind a fake conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg p-3">
              {success}
            </div>
          )}

          {/* Current Cover Status */}
          {currentCover && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-yellow-400" />
                  <div>
                    <p className="text-yellow-300 text-sm font-medium">Cover Active</p>
                    <p className="text-yellow-400/70 text-xs">Showing as "{currentCover.contactName}" ({currentCover.category})</p>
                  </div>
                </div>
                <button
                  onClick={removeCover}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Remove cover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin text-[#00a884]" size={24} />
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-xs">
                Select a conversation below to hide "{chatName}" behind it. The real chat will be hidden from the chat list.
              </p>

              {/* Conversation List */}
              <div className="space-y-2">
                {premadeConversations.map((conv) => {
                  const isActive = currentCover?.templateId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => applyCover(conv.id)}
                      disabled={saving}
                      className={`w-full rounded-lg p-3 border transition-all text-left disabled:opacity-40 ${
                        isActive
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-[#0b141a] border-white/10 hover:border-[#00a884]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                            <MessageCircle size={18} className="text-[#00a884]" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{conv.contactName}</p>
                            <p className="text-gray-400 text-xs">{conv.category} • {conv.messageCount} messages</p>
                          </div>
                        </div>
                        <div>
                          {isActive ? (
                            <Check size={18} className="text-yellow-400" />
                          ) : saving ? (
                            <RefreshCw size={16} className="animate-spin text-gray-400" />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeChatCoverPanel;
