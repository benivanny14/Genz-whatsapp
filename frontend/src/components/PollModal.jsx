import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const PollModal = ({ onClose }) => {
  const { createPoll } = useChat();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']); // Starts with 2 options

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions((options || []).filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!question.trim()) {
      alert("Please enter a poll question.");
      return;
    }
    const filteredOptions = (options || []).filter(opt => opt.trim() !== '');
    if (filteredOptions.length < 2) {
      alert("Please enter at least 2 options.");
      return;
    }
    createPoll(question, filteredOptions);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} />
            <h2 className="font-bold text-lg">Create Poll</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-1 block">Question</label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-1 block">Options (Max 5)</label>
            {(options || []).map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg p-2 text-dark-text focus:outline-none focus:border-primary-500"
                />
                {options.length > 2 && (
                  <button onClick={() => handleRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={18} /></button>
                )}
              </div>
            ))}
          </div>

          {options.length < 5 && (
            <button onClick={handleAddOption} className="flex items-center gap-2 text-primary-500 font-medium text-sm hover:underline">
              <Plus size={16} /> Add Option
            </button>
          )}

          <button onClick={handleSubmit} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollModal;
