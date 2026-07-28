import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Type, Palette, Image as ImageIcon, Trash2, Users, Search, Check, MapPin, Clock, Music, Link as LinkIcon, HelpCircle, Timer, Camera, Grid, Layers, Sparkles, Mic, Film, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';

const BG_COLORS = [
  '#008069', '#8E24AA', '#E91E63', '#F44336', '#FF9800', 
  '#4CAF50', '#009688', '#00BCD4', '#3F51B5', '#673AB7', 
  '#795548', '#607D8B', '#111111', '#2C3E50', '#D35400'
];

const FONTS = [
  { name: 'Sans', class: 'font-sans' },
  { name: 'Serif', class: 'font-serif' },
  { name: 'Mono', class: 'font-mono' },
  { name: 'Impact', class: 'font-black uppercase tracking-wider' },
  { name: 'Cursive', class: 'italic' }
];

const STATUS_MODES = [
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'image', icon: ImageIcon, label: 'Photo' },
  { id: 'video', icon: Film, label: 'Video' },
  { id: 'gif', icon: Play, label: 'GIF' },
  { id: 'link', icon: LinkIcon, label: 'Link' },
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'quiz', icon: HelpCircle, label: 'Quiz' },
  { id: 'question', icon: Sparkles, label: 'Question' },
  { id: 'countdown', icon: Clock, label: 'Countdown' },
  { id: 'location', icon: MapPin, label: 'Location' },
  { id: 'collage', icon: Layers, label: 'Collage' },
  { id: 'boomerang', icon: RotateCcw, label: 'Boomerang' },
  { id: 'livePhoto', icon: Camera, label: 'Live Photo' },
  { id: 'dualCamera', icon: Grid, label: 'Dual Camera' },
  { id: 'timer', icon: Timer, label: 'Timer' }
];

const StatusCreator = ({ onClose, onSend, initialMode = 'text', initialMedia = null, enableCollab = false }) => {
  const [mode, setMode] = useState(initialMode);
  const [text, setText] = useState('');
  const [media, setMedia] = useState(initialMedia);
  const [caption, setCaption] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Additional mode-specific states
  const [linkUrl, setLinkUrl] = useState('');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '']);
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState(0);
  const [questionText, setQuestionText] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  const [countdownTime, setCountdownTime] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [collageImages, setCollageImages] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Collab State
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [collabUser, setCollabUser] = useState(null);
  const [collabSearch, setCollabSearch] = useState('');

  const { conversations } = useChat();
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  // Extract unique participants for collab picker
  const contactOptions = React.useMemo(() => {
    if (!conversations) return [];
    const seen = new Set();
    const people = [];
    for (const conv of conversations) {
      if (!conv.isGroup && conv.participants) {
        for (const p of conv.participants) {
          if (!seen.has(p._id || p.id)) {
            seen.add(p._id || p.id);
            people.push(p);
          }
        }
      }
    }
    return people;
  }, [conversations]);

  const filteredContacts = contactOptions.filter(c =>
    !collabSearch || (c.username || '').toLowerCase().includes(collabSearch.toLowerCase())
  );

  const cycleColor = () => setColorIndex((prev) => (prev + 1) % BG_COLORS.length);
  const cycleFont = () => setFontIndex((prev) => (prev + 1) % FONTS.length);

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 100) {
        alert('File size too large (max 100MB)');
        return;
      }
      setMedia(file);
      setMode('media');
    }
  };

  const handleSend = async () => {
    if (isSending) return;
    if (mode === 'text' && !text.trim()) return;
    if ((mode === 'image' || mode === 'video' || mode === 'gif') && !media) return;
    if (mode === 'link' && !linkUrl.trim()) return;
    if (mode === 'quiz' && !quizQuestion.trim()) return;
    if (mode === 'question' && !questionText.trim()) return;
    if (mode === 'countdown' && (!countdownDate || !countdownTime)) return;
    if (mode === 'location' && !locationData) return;
    if (mode === 'collage' && collageImages.filter(img => img).length === 0) return;

    setIsSending(true);
    try {
      const collabData = collabUser ? { collabUserId: collabUser._id || collabUser.id, collabUsername: collabUser.username } : {};
      
      let payload = {
        type: mode,
        bgColor: BG_COLORS[colorIndex],
        fontClass: FONTS[fontIndex].class,
        ...collabData
      };

      switch (mode) {
        case 'text':
          payload.content = text;
          break;
        case 'image':
        case 'video':
        case 'gif':
          payload.mediaFile = media;
          payload.caption = caption;
          break;
        case 'link':
          payload.content = text;
          payload.linkUrl = linkUrl;
          break;
        case 'quiz':
          payload.quizQuestion = quizQuestion;
          payload.quizOptions = quizOptions;
          payload.quizCorrectAnswer = quizCorrectAnswer;
          break;
        case 'question':
          payload.content = questionText;
          break;
        case 'countdown':
          payload.countdownDate = countdownDate;
          payload.countdownTime = countdownTime;
          break;
        case 'location':
          payload.locationData = locationData;
          break;
        case 'collage':
          payload.collageImages = collageImages;
          break;
        case 'timer':
          payload.timerSeconds = timerSeconds;
          break;
        default:
          payload.content = text;
      }

      await onSend(payload);
      onClose();
    } catch (err) {
      console.error('Failed to send status:', err);
      alert('Failed to send status');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors" aria-label="Close">
          <X size={24} />
        </button>

        <div className="flex items-center gap-2">
          {/* Mode Selector Button */}
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors font-bold text-sm"
          >
            <Sparkles size={16} />
            {STATUS_MODES.find(m => m.id === mode)?.label || 'Mode'}
          </button>

          {/* Collab Button */}
          {enableCollab && (
            <button
              onClick={() => setShowCollabPicker(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                collabUser
                  ? 'bg-pink-500 text-white'
                  : 'bg-black/30 hover:bg-black/50 text-white'
              }`}
            >
              <Users size={16} />
              {collabUser ? `Collab: @${collabUser.username}` : 'Collab'}
            </button>
          )}

          {mode === 'text' && (
            <>
              <button onClick={cycleFont} className="px-3 py-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors font-bold text-sm">
                <Type size={18} className="inline mr-1" />
                {FONTS[fontIndex].name}
              </button>
              <button onClick={cycleColor} className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors" aria-label="Theme">
                <Palette size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode Selector Modal */}
      <AnimatePresence>
        {showModeSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-[#111b21] border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <div className="grid grid-cols-5 gap-2">
              {STATUS_MODES.map((modeItem) => {
                const Icon = modeItem.icon;
                return (
                  <button
                    key={modeItem.id}
                    onClick={() => { setMode(modeItem.id); setShowModeSelector(false); }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      mode === modeItem.id ? 'bg-[#00a884] text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs">{modeItem.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collab badge */}
      {collabUser && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-sm border border-pink-500/40">
            <span className="text-pink-400">✨ Collab with</span>
            <span className="font-bold">@{collabUser.username}</span>
            <button
              className="pointer-events-auto ml-1 text-white/60 hover:text-white transition-colors"
              onClick={() => setCollabUser(null)}
             aria-label="Close">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {mode === 'text' ? (
        <div
          className="w-full h-full flex items-center justify-center p-8 transition-colors duration-300"
          style={{ backgroundColor: BG_COLORS[colorIndex] }}
          onClick={() => textInputRef.current?.focus()}
        >
          <textarea
            ref={textInputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status"
            className={`w-full max-w-2xl bg-transparent border-none outline-none text-center text-white placeholder-white/50 resize-none text-4xl md:text-5xl drop-shadow-md ${FONTS[fontIndex].class}`}
            rows={5}
            autoFocus
          />
        </div>
      ) : mode === 'link' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter link URL"
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 outline-none focus:border-white/40 mb-4"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add link description"
            className={`w-full max-w-2xl bg-transparent border-none outline-none text-center text-white placeholder-white/50 resize-none text-3xl ${FONTS[fontIndex].class}`}
            rows={3}
          />
        </div>
      ) : mode === 'quiz' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <input
            type="text"
            value={quizQuestion}
            onChange={(e) => setQuizQuestion(e.target.value)}
            placeholder="Quiz question"
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 outline-none focus:border-white/40 mb-4"
          />
          {quizOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="correctAnswer"
                checked={quizCorrectAnswer === index}
                onChange={() => setQuizCorrectAnswer(index)}
                className="w-4 h-4"
              />
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...quizOptions];
                  newOptions[index] = e.target.value;
                  setQuizOptions(newOptions);
                }}
                placeholder={`Option ${index + 1}`}
                className="w-full max-w-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 outline-none focus:border-white/40"
              />
            </div>
          ))}
        </div>
      ) : mode === 'question' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ask a question..."
            className={`w-full max-w-2xl bg-transparent border-none outline-none text-center text-white placeholder-white/50 resize-none text-3xl ${FONTS[fontIndex].class}`}
            rows={4}
          />
        </div>
      ) : mode === 'countdown' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <input
            type="date"
            value={countdownDate}
            onChange={(e) => setCountdownDate(e.target.value)}
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white outline-none focus:border-white/40 mb-4"
          />
          <input
            type="time"
            value={countdownTime}
            onChange={(e) => setCountdownTime(e.target.value)}
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white outline-none focus:border-white/40"
          />
        </div>
      ) : mode === 'location' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setLocationData({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude
                    });
                  },
                  (err) => alert('Failed to get location')
                );
              }
            }}
            className="flex flex-col items-center gap-2 px-6 py-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <MapPin size={32} />
            <span className="text-white">Get Current Location</span>
          </button>
          {locationData && (
            <p className="text-white mt-4">Location: {locationData.lat.toFixed(4)}, {locationData.lng.toFixed(4)}</p>
          )}
        </div>
      ) : mode === 'collage' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="aspect-square bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                {collageImages[index] ? (
                  <img src={URL.createObjectURL(collageImages[index])} alt="" className="w-full h-full object-cover" />
                ) : (
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const newImages = [...collageImages];
                        newImages[index] = e.target.files[0];
                        setCollageImages(newImages);
                      };
                      input.click();
                    }}
                    className="text-white/50 hover:text-white"
                  >
                    <ImageIcon size={32} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : mode === 'timer' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG_COLORS[colorIndex] }}>
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setTimerSeconds(Math.max(1, timerSeconds - 1))}
              className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
            >
              -
            </button>
            <span className="text-6xl text-white font-bold">{timerSeconds}s</span>
            <button
              onClick={() => setTimerSeconds(timerSeconds + 1)}
              className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
            >
              +
            </button>
          </div>
          <p className="text-white/70">Auto-capture after timer</p>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center pt-16 pb-24 px-4">
          {media ? (
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl">
              {media.type.startsWith('video') ? (
                <video src={URL.createObjectURL(media)} controls className="max-w-full max-h-full object-contain" />
              ) : (
                <img src={URL.createObjectURL(media)} alt="Preview" className="max-w-full max-h-full object-contain" />
              )}
              <button
                onClick={() => setMedia(null)}
                className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
               aria-label="Delete">
                <Trash2 size={20} />
              </button>
            </div>
          ) : (
            <div className="flex-1 w-full flex items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-white/30 rounded-2xl hover:border-white/60 hover:bg-white/5 transition-all"
              >
                <ImageIcon size={64} className="text-white/50" />
                <span className="text-white/70 font-medium text-lg">Click to select photo or video</span>
              </button>
            </div>
          )}

          <div className="w-full max-w-2xl mt-4 relative">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-dark-surface/80 border border-white/20 rounded-full px-6 py-3.5 pr-14 text-white focus:outline-none focus:border-primary-500 transition-colors shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        onChange={handleMediaChange}
        className="hidden"
      />

      {/* Bottom Send Button */}
      <AnimatePresence>
        {(
          (mode === 'text' && text.trim()) ||
          ((mode === 'image' || mode === 'video' || mode === 'gif') && media) ||
          (mode === 'link' && linkUrl.trim()) ||
          (mode === 'quiz' && quizQuestion.trim()) ||
          (mode === 'question' && questionText.trim()) ||
          (mode === 'countdown' && countdownDate && countdownTime) ||
          (mode === 'location' && locationData) ||
          (mode === 'collage' && collageImages.filter(img => img).length > 0) ||
          (mode === 'timer' && timerSeconds > 0)
        ) && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleSend}
            disabled={isSending}
            className="absolute bottom-6 right-6 w-14 h-14 bg-[#25D366] hover:bg-[#128C7E] rounded-full flex items-center justify-center text-white shadow-xl transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={24} style={{ marginLeft: 4 }} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Collab Picker Modal */}
      <AnimatePresence>
        {showCollabPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCollabPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111b21] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Users size={20} className="text-pink-400" />
                <h3 className="text-white font-bold text-lg">Add Collab Partner</h3>
                <button onClick={() => setShowCollabPicker(false)} className="ml-auto text-white/60 hover:text-white" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 mb-3">
                  <Search size={16} className="text-white/40" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={collabSearch}
                    onChange={e => setCollabSearch(e.target.value)}
                    className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/40"
                    autoFocus
                  />
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-white/40 text-sm py-4">No contacts found</p>
                  )}
                  {filteredContacts.map(contact => (
                    <button
                      key={contact._id || contact.id}
                      onClick={() => { setCollabUser(contact); setShowCollabPicker(false); setCollabSearch(''); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                        {contact.profilePicture
                          ? <img src={contact.profilePicture} alt="" className="w-full h-full object-cover" />
                          : (contact.username?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">@{contact.username}</span>
                      {collabUser && (collabUser._id || collabUser.id) === (contact._id || contact.id) && (
                        <Check size={16} className="ml-auto text-pink-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StatusCreator;
