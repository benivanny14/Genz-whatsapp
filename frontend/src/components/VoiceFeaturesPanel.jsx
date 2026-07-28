import React, { useState } from 'react';
import { X, Mic, MessageSquare, Volume2, Search, Command } from 'lucide-react';

const VoiceFeaturesPanel = ({ onClose, onSave }) => {
  const [voiceSearchEnabled, setVoiceSearchEnabled] = useState(false);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [voiceReadEnabled, setVoiceReadEnabled] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');

  const languages = [
    { id: 'en-US', label: 'English (US)' },
    { id: 'en-GB', label: 'English (UK)' },
    { id: 'sw-TZ', label: 'Swahili' },
    { id: 'es-ES', label: 'Spanish' },
    { id: 'fr-FR', label: 'French' },
    { id: 'de-DE', label: 'German' },
    { id: 'ar-SA', label: 'Arabic' },
    { id: 'hi-IN', label: 'Hindi' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        voiceSearchEnabled,
        voiceCommandsEnabled,
        voiceReadEnabled,
        voiceReplyEnabled,
        voiceLanguage
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Mic className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Voice Features</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Voice Search */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Voice Search</p>
                  <p className="text-white/50 text-sm">Search using voice commands</p>
                </div>
              </div>
              <button
                onClick={() => setVoiceSearchEnabled(!voiceSearchEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  voiceSearchEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Voice Commands */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Command size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Voice Commands</p>
                  <p className="text-white/50 text-sm">Control app with voice</p>
                </div>
              </div>
              <button
                onClick={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  voiceCommandsEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceCommandsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {voiceCommandsEnabled && (
              <div className="mt-4 space-y-2">
                <p className="text-white/60 text-sm">Available Commands:</p>
                <div className="space-y-1">
                  <p className="text-white/40 text-xs">"Send message to [name]"</p>
                  <p className="text-white/40 text-xs">"Call [name]"</p>
                  <p className="text-white/40 text-xs">"Open chat"</p>
                  <p className="text-white/40 text-xs">"Create status"</p>
                </div>
              </div>
            )}
          </div>

          {/* Voice Read Messages */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Voice Read Messages</p>
                  <p className="text-white/50 text-sm">Read messages aloud</p>
                </div>
              </div>
              <button
                onClick={() => setVoiceReadEnabled(!voiceReadEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  voiceReadEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceReadEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Voice Reply */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Voice Reply</p>
                  <p className="text-white/50 text-sm">Reply with voice messages</p>
                </div>
              </div>
              <button
                onClick={() => setVoiceReplyEnabled(!voiceReplyEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  voiceReplyEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Mic size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Voice Language</h3>
            </div>
            <select
              value={voiceLanguage}
              onChange={(e) => setVoiceLanguage(e.target.value)}
              className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Test Voice */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Test Voice Features</h3>
            <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2">
              <Mic size={18} />
              Test Voice Recognition
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Voice Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceFeaturesPanel;
