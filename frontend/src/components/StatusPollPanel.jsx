import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, BarChart3, Plus, Trash2, CheckCircle, Clock, Users } from 'lucide-react';

const StatusPollPanel = ({ onClose, status, onPollCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(24);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (status?.quizQuestion) {
      setQuestion(status.quizQuestion);
      setOptions(status.quizOptions || ['', '']);
    }
  }, [status]);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert('Please add at least 2 options');
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          duration,
          allowMultiple,
          isAnonymous
        })
      });

      const data = await response.json();
      if (data.success) {
        const pollData = {
          question: question.trim(),
          options: validOptions,
          duration,
          allowMultiple,
          isAnonymous
        };

        if (onPollCreate) {
          onPollCreate(pollData);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Create Poll</h2>
              <p className="text-white/60 text-xs">Add interactive poll to status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Question */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/60 text-xs">Options ({options.length}/10)</label>
              <button
                onClick={handleAddOption}
                disabled={options.length >= 10}
                className="text-[#00a884] text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Plus size={14} />
                Add Option
              </button>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Poll Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1" className="bg-[#1a2e35]">1 hour</option>
              <option value="6" className="bg-[#1a2e35]">6 hours</option>
              <option value="12" className="bg-[#1a2e35]">12 hours</option>
              <option value="24" className="bg-[#1a2e35]">24 hours</option>
              <option value="48" className="bg-[#1a2e35]">2 days</option>
              <option value="72" className="bg-[#1a2e35]">3 days</option>
              <option value="168" className="bg-[#1a2e35]">1 week</option>
            </select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Allow multiple selections</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Anonymous voting</span>
            </label>
          </div>

          {/* Preview */}
          {question && options.some(opt => opt.trim()) && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium mb-3">Preview</p>
              <p className="text-white mb-3">{question}</p>
              <div className="space-y-2">
                {options.filter(opt => opt.trim()).map((option, index) => (
                  <div key={index} className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 rounded" />
                    <span className="text-white text-sm">{option}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs mt-3">
                <Clock size={12} />
                <span>{duration} hours</span>
                <Users size={12} />
                <span>{isAnonymous ? 'Anonymous' : 'Public'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleCreatePoll}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusPollPanel;
