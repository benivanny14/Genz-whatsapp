import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Heart, Trash2, Reply, MoreVertical, Smile, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Comments = ({ statusId, comments, onAddComment, onDeleteComment, onLikeComment, onClose }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😮', '😢', '👏', '🙏'];

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      userId: 'current-user',
      userName: 'You',
      timestamp: Date.now(),
      likes: 0,
      isLiked: false,
      replyTo: replyingTo
    };

    onAddComment(comment);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setNewComment('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#1a2e35] rounded-2xl w-full max-w-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
            <MessageCircle size={20} className="text-[#00a884]" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Comments</h3>
            <p className="text-gray-400 text-xs">{comments.length} comments</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Comments List */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {comments.map(comment => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#0b141a] rounded-lg p-3"
          >
            {/* Reply indicator */}
            {comment.replyTo && (
              <div className="mb-2 pl-3 border-l-2 border-[#00a884]/30">
                <p className="text-gray-500 text-xs">
                  Replying to <span className="text-[#00a884]">{comment.replyTo.userName}</span>
                </p>
                <p className="text-gray-400 text-xs line-clamp-1">{comment.replyTo.text}</p>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {comment.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{comment.userName}</span>
                  <span className="text-gray-500 text-xs">{formatTime(comment.timestamp)}</span>
                </div>
                <p className="text-gray-200 text-sm">{comment.text}</p>
                
                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => onLikeComment(comment.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      comment.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
                    {comment.likes > 0 && comment.likes}
                  </button>
                  <button
                    onClick={() => handleReply(comment)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#00a884] transition-colors"
                  >
                    <Reply size={14} />
                    Reply
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="text-gray-600 mx-auto mb-2" size={32} />
            <p className="text-gray-400 text-sm">No comments yet</p>
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#00a884]/10 border-t border-[#00a884]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply size={14} className="text-[#00a884]" />
              <span className="text-gray-400 text-xs">
                Replying to <span className="text-[#00a884]">{replyingTo.userName}</span>
              </span>
            </div>
            <button
              onClick={handleCancelReply}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[#00a884]/20">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            
            {/* Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#1a2e35] rounded-lg p-2 grid grid-cols-5 gap-1 shadow-xl"
                >
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewComment(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl hover:bg-[#00a884]/20 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Smile size={20} />
          </button>

          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Comment Button Component
export const CommentButton = ({ commentCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-400 hover:text-[#00a884] transition-colors"
    >
      <MessageCircle size={18} />
      <span className="text-sm">{commentCount}</span>
    </button>
  );
};

// Comments Settings Component
export const CommentsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <MessageCircle size={18} className="text-[#00a884]" />
            Comments
          </p>
          <p className="text-gray-400 text-sm">Allow comments on status</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, commentsEnabled: !settings.commentsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.commentsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.commentsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.commentsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow replies</p>
              <p className="text-gray-400 text-xs">Enable reply threads</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, allowReplies: !settings.allowReplies })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.allowReplies ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.allowReplies ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow likes</p>
              <p className="text-gray-400 text-xs">Enable comment likes</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, allowLikes: !settings.allowLikes })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.allowLikes ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.allowLikes ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Moderate comments</p>
              <p className="text-gray-400 text-xs">Review before publishing</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, moderateComments: !settings.moderateComments })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.moderateComments ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.moderateComments ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Who can comment</p>
            <select
              value={settings.whoCanComment || 'everyone'}
              onChange={(e) => onUpdate({ ...settings, whoCanComment: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts</option>
              <option value="followers">Followers only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Comments List Component
export const CommentsList = ({ comments, onCommentClick }) => {
  return (
    <div className="space-y-2">
      {comments.slice(0, 3).map(comment => (
        <div
          key={comment.id}
          onClick={() => onCommentClick(comment)}
          className="bg-[#0b141a] rounded-lg p-3 cursor-pointer hover:bg-[#1a2e35] transition-colors"
        >
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {comment.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-medium">{comment.userName}</span>
                <span className="text-gray-500 text-xs">{new Date(comment.timestamp).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-300 text-sm line-clamp-2">{comment.text}</p>
            </div>
          </div>
        </div>
      ))}
      {comments.length > 3 && (
        <button
          onClick={() => onCommentClick(null)}
          className="text-[#00a884] text-sm hover:underline"
        >
          View all {comments.length} comments
        </button>
      )}
    </div>
  );
};

export default Comments;
