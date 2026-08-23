import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStatusContext } from '../context/StatusContext';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin, Music } from 'lucide-react';
import { getAuthToken } from '../utils/tokenStore';
import { resolveApiBase } from '../utils/resolveApiBase';
import './StatusReel.css';

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '🔥'];

const StatusReel = ({ statuses, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const videoRef = useRef(null);
  const API_URL = resolveApiBase();

  const current = statuses[currentIndex];
  const currentId = current?._id;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleLike = async () => {
    if (!currentId) return;
    setLiked(prev => ({ ...prev, [currentId]: !prev[currentId] }));
    
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/status/${currentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ emoji: '❤️' })
      });
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !currentId) return;
    
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/status/${currentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: comment })
      });
      setComment('');
      setShowComment(false);
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const handleSave = async () => {
    if (!currentId) return;
    setSaved(prev => ({ ...prev, [currentId]: !prev[currentId] }));
    
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/status/${currentId}/favorite`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleShare = async () => {
    if (!currentId) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/status/${currentId}/share-token`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (!current) return null;

  return (
    <div className="status-reel-overlay" onClick={onClose}>
      <div className="status-reel-container" onClick={e => e.stopPropagation()}>
        {/* Progress Bar */}
        <div className="reel-progress-bar">
          {statuses.map((_, idx) => (
            <div key={idx} className="reel-progress-segment">
              <div 
                className="reel-progress-fill" 
                style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? '50%' : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="reel-header">
          <img src={current.userId?.profilePicture || '/default-avatar.png'} alt="" />
          <div>
            <h4>{current.userId?.username || 'Unknown'}</h4>
            <span>{new Date(current.createdAt).toLocaleTimeString()}</span>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="reel-content" onClick={goNext}>
          {current.type === 'image' && (
            <img src={current.content} alt="status" className="reel-media" />
          )}
          {current.type === 'video' && (
            <video 
              ref={videoRef}
              src={current.content} 
              autoPlay 
              muted 
              loop 
              playsInline
              className="reel-media"
            />
          )}
          {current.type === 'text' && (
            <div className="reel-text" style={{ 
              background: current.textStatus?.backgroundColor || '#128C7E' 
            }}>
              <h1>{current.textStatus?.text}</h1>
            </div>
          )}

          {/* Music Tag */}
          {current.music && (
            <div className="reel-music-tag">
              <Music size={14} />
              <span>{current.music.title || 'Music'}</span>
            </div>
          )}

          {/* Location Tag */}
          {current.locationData && (
            <div className="reel-location-tag">
              <MapPin size={14} />
              <span>{current.locationData.address || 'Location'}</span>
            </div>
          )}

          {/* Caption */}
          {current.caption && (
            <div className="reel-caption">{current.caption}</div>
          )}
        </div>

        {/* Right Actions */}
        <div className="reel-actions">
          <button onClick={(e) => { e.stopPropagation(); handleLike(); }}>
            <Heart size={28} fill={liked[currentId] ? '#ff4444' : 'none'} color={liked[currentId] ? '#ff4444' : '#fff'} />
            <span>{(current.likesCount || 0) + (liked[currentId] ? 1 : 0)}</span>
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); setShowComment(true); }}>
            <MessageCircle size={28} />
            <span>{current.replies?.length || 0}</span>
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); handleShare(); }}>
            <Send size={28} />
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); handleSave(); }}>
            <Bookmark size={28} fill={saved[currentId] ? '#00a884' : 'none'} color={saved[currentId] ? '#00a884' : '#fff'} />
            <span>{saved[currentId] ? 'Saved' : 'Save'}</span>
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); setShowActions(true); }}>
            <MoreHorizontal size={28} />
          </button>
        </div>

        {/* Comment Modal */}
        {showComment && (
          <div className="reel-comment-modal" onClick={e => e.stopPropagation()}>
            <h3>Reply to Status</h3>
            <input 
              type="text" 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
              placeholder="Write a reply..."
              autoFocus
            />
            <button onClick={handleComment}>Send</button>
          </div>
        )}

        {/* Actions Menu */}
        {showActions && (
          <div className="reel-actions-menu" onClick={e => e.stopPropagation()}>
            <button onClick={handleSave}>Save Status</button>
            <button onClick={handleShare}>Share</button>
            <button onClick={() => setShowActions(false)}>Cancel</button>
          </div>
        )}

        {/* Navigation */}
        <div className="reel-nav left" onClick={(e) => { e.stopPropagation(); goPrev(); }} />
        <div className="reel-nav right" onClick={(e) => { e.stopPropagation(); goNext(); }} />
      </div>
    </div>
  );
};

export default StatusReel;
