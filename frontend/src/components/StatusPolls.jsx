import React, { useState } from 'react';
import { BarChart3, Plus, X, Trash2, Check, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusPolls = ({ poll, onVote, onAddOption, onRemoveOption, onClose }) => {
  const [newOption, setNewOption] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    onAddOption(poll._id, newOption);
    setNewOption('');
  };

  const handleVote = (optionId) => {
    setSelectedOption(optionId);
    onVote(poll._id, optionId);
  };

  const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-[#00a884]" size={20} />
          <h3 className="text-white font-semibold">Poll</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <p className="text-white mb-4">{poll.question}</p>

      <div className="space-y-3 mb-4">
        {poll.options?.map((option, index) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = selectedOption === option.id;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <button
                onClick={() => handleVote(option.id)}
                disabled={poll.hasVoted}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#00a884] bg-[#00a884]/20'
                    : 'border-[#00a884]/30 hover:border-[#00a884]'
                } ${poll.hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{option.text}</span>
                  {poll.hasVoted && (
                    <span className="text-[#00a884] text-sm font-medium">{percentage}%</span>
                  )}
                </div>
                
                {poll.hasVoted && (
                  <div className="w-full bg-[#0b141a] rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="bg-[#00a884] h-full rounded-full"
                    />
                  </div>
                )}
              </button>

              {!poll.hasVoted && (
                <button
                  onClick={() => onRemoveOption(poll._id, option.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {!poll.hasVoted && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Add option..."
            className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
          />
          <button
            onClick={handleAddOption}
            disabled={!newOption.trim()}
            className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {poll.hasVoted && (
        <div className="flex items-center gap-4 text-sm text-gray-400 mt-4">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{totalVotes} votes</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{new Date(poll.expiresAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Poll Creator Component
export const PollCreator = ({ onCreatePoll, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('24hours');

  const durations = [
    { value: '1hour', label: '1 hour' },
    { value: '6hours', label: '6 hours' },
    { value: '24hours', label: '24 hours' },
    { value: '3days', label: '3 days' },
    { value: '7days', label: '7 days' },
  ];

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
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;

    const poll = {
      id: Date.now(),
      question,
      options: options.filter(o => o.trim()).map((text, index) => ({
        id: index,
        text,
        votes: 0
      })),
      duration,
      expiresAt: Date.now() + getDurationMs(duration),
      hasVoted: false
    };

    onCreatePoll(poll);
    onClose();
  };

  const getDurationMs = (duration) => {
    switch (duration) {
      case '1hour': return 60 * 60 * 1000;
      case '6hours': return 6 * 60 * 60 * 1000;
      case '24hours': return 24 * 60 * 60 * 1000;
      case '3days': return 3 * 24 * 60 * 60 * 1000;
      case '7days': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="text-[#00a884]" />
            Create Poll
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Options</label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                onClick={handleAddOption}
                className="mt-2 text-[#00a884] text-sm hover:underline"
              >
                + Add option
              </button>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              {durations.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Create Poll
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Poll Display Component
export const PollDisplay = ({ poll, onVote }) => {
  const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0;

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Poll</span>
      </div>

      <p className="text-white mb-4">{poll.question}</p>

      <div className="space-y-2">
        {poll.options?.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          
          return (
            <div key={option.id} className="relative">
              <button
                onClick={() => !poll.hasVoted && onVote(poll.id, option.id)}
                disabled={poll.hasVoted}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  poll.hasVoted
                    ? 'border-[#00a884]/30 cursor-default'
                    : 'border-[#00a884]/30 hover:border-[#00a884] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{option.text}</span>
                  {poll.hasVoted && (
                    <span className="text-[#00a884] text-sm font-medium">{percentage}%</span>
                  )}
                </div>
                
                {poll.hasVoted && (
                  <div className="w-full bg-[#0b141a] rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="bg-[#00a884] h-full rounded-full"
                    />
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {poll.hasVoted && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mt-3">
          <Users size={14} />
          <span>{totalVotes} votes</span>
        </div>
      )}
    </div>
  );
};

// Poll Settings Component
export const PollSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <BarChart3 size={18} className="text-[#00a884]" />
            Status Polls
          </p>
          <p className="text-gray-400 text-sm">Create polls on status</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, pollsEnabled: !settings.pollsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.pollsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.pollsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.pollsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Anonymous voting</p>
              <p className="text-gray-400 text-xs">Hide voter identities</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, anonymousPolls: !settings.anonymousPolls })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.anonymousPolls ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.anonymousPolls ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Multiple votes</p>
              <p className="text-gray-400 text-xs">Allow voting multiple times</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, multipleVotes: !settings.multipleVotes })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.multipleVotes ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.multipleVotes ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default duration</p>
            <select
              value={settings.defaultPollDuration || '24hours'}
              onChange={(e) => onUpdate({ ...settings, defaultPollDuration: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1hour">1 hour</option>
              <option value="6hours">6 hours</option>
              <option value="24hours">24 hours</option>
              <option value="3days">3 days</option>
              <option value="7days">7 days</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPolls;
