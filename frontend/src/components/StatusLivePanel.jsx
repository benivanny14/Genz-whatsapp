import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Video, Users, Heart, MessageCircle, Share2, MoreVertical, Eye, Clock, Zap, Ban } from 'lucide-react';

const StatusLivePanel = ({ onClose, onStartLive }) => {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [saveRecording, setSaveRecording] = useState(false);
  const [maxDuration, setMaxDuration] = useState(60);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
        setViewerCount(prev => prev + Math.floor(Math.random() * 5));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartLive = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your live status');
      return;
    }

    setIsStarting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          allowComments,
          allowReactions,
          saveRecording,
          maxDuration
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsLive(true);
        if (onStartLive) {
          onStartLive({ title, description, allowComments, allowReactions, saveRecording, maxDuration });
        }
      }
    } catch (error) {
      console.error('Error starting live:', error);
      alert('Failed to start live. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndLive = () => {
    setIsLive(false);
    setDuration(0);
    setViewerCount(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Video className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Live Status</h2>
              <p className="text-white/60 text-xs">Go live with your status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isLive ? (
            <>
              {/* Title */}
              <div>
                <label className="text-white/60 text-xs mb-2 block">Live Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's happening live?"
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-white/60 text-xs mb-2 block">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
                />
              </div>

              {/* Max Duration */}
              <div>
                <label className="text-white/60 text-xs mb-2 block">Max Duration</label>
                <select
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                >
                  <option value={15} className="bg-[#1a2e35]">15 minutes</option>
                  <option value={30} className="bg-[#1a2e35]">30 minutes</option>
                  <option value={60} className="bg-[#1a2e35]">1 hour</option>
                  <option value={120} className="bg-[#1a2e35]">2 hours</option>
                </select>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Allow comments</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowReactions}
                    onChange={(e) => setAllowReactions(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Allow reactions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveRecording}
                    onChange={(e) => setSaveRecording(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Save recording</span>
                </label>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartLive}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                <Zap size={20} />
                Start Live
              </button>
            </>
          ) : (
            <>
              {/* Live View */}
              <div className="bg-black rounded-xl aspect-video relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                      <Video size={32} className="text-white" />
                    </div>
                    <p className="text-white font-medium">Live</p>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                    <Eye size={14} className="text-white" />
                    <span className="text-white text-sm">{viewerCount}</span>
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                    <Clock size={14} className="text-white" />
                    <span className="text-white text-sm">{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Live Badge */}
                <div className="absolute top-3 right-3 bg-red-600 rounded-lg px-3 py-1 flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                  <div className="flex gap-2">
                    <button className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                      <Heart size={18} />
                    </button>
                    <button className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                      <MessageCircle size={18} />
                    </button>
                    <button className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                      <Share2 size={18} />
                    </button>
                  </div>
                  <button className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Live Info */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-medium">{title}</p>
                {description && <p className="text-white/60 text-sm mt-1">{description}</p>}
              </div>

              {/* End Button */}
              <button
                onClick={handleEndLive}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                <Ban size={20} />
                End Live
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusLivePanel;
