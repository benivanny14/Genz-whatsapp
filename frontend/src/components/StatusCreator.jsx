import { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Camera, Image, Type, MapPin, Calendar, Mic, Send, Check } from 'lucide-react';
import statusService from '../services/statusService';

const StatusCreator = ({ onClose }) => {
  const { user } = useChat();
  const [statusType, setStatusType] = useState('text'); // text, image, video, voice, location
  const [content, setContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#00a884');
  const [textColor, setTextColor] = useState('#ffffff');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [privacy, setPrivacy] = useState('contacts');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const backgroundColors = [
    '#00a884', '#128C7E', '#25D366', '#34B7F1', '#667781', '#FFC300', '#FF5733', '#C70039'
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!content && !file) {
      alert('Please add content or media');
      return;
    }

    setLoading(true);
    try {
      const statusData = {
        type: statusType,
        caption: content,
        backgroundColor,
        textColor,
        privacy,
        file
      };

      await statusService.uploadStatus(statusData);
      onClose();
    } catch (error) {
      console.error('Error creating status:', error);
      alert('Failed to create status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] backdrop-blur-sm">
      <div className="bg-dark-surface rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-dark-border overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
          <h3 className="font-bold">Create Status</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status Type Selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
            <button
              onClick={() => setStatusType('text')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${statusType === 'text' ? 'bg-primary-600 text-white' : 'bg-dark-hover text-dark-text'}`}
            >
              <Type size={20} />
              <span className="text-xs">Text</span>
            </button>
            <button
              onClick={() => setStatusType('image')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${statusType === 'image' ? 'bg-primary-600 text-white' : 'bg-dark-hover text-dark-text'}`}
            >
              <Image size={20} />
              <span className="text-xs">Image</span>
            </button>
            <button
              onClick={() => setStatusType('video')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${statusType === 'video' ? 'bg-primary-600 text-white' : 'bg-dark-hover text-dark-text'}`}
            >
              <Camera size={20} />
              <span className="text-xs">Video</span>
            </button>
            <button
              onClick={() => setStatusType('voice')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${statusType === 'voice' ? 'bg-primary-600 text-white' : 'bg-dark-hover text-dark-text'}`}
            >
              <Mic size={20} />
              <span className="text-xs">Voice</span>
            </button>
            <button
              onClick={() => setStatusType('location')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${statusType === 'location' ? 'bg-primary-600 text-white' : 'bg-dark-hover text-dark-text'}`}
            >
              <MapPin size={20} />
              <span className="text-xs">Location</span>
            </button>
          </div>

          {/* Text Status */}
          {statusType === 'text' && (
            <div className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your status..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary-500 resize-none h-32"
                style={{ backgroundColor, color: textColor }}
              />
              <div>
                <label className="text-xs text-dark-textSecondary font-bold uppercase block mb-2">Background Color</label>
                <div className="flex gap-2 flex-wrap">
                  {backgroundColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${backgroundColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-textSecondary font-bold uppercase block mb-2">Text Color</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTextColor('#ffffff')}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${textColor === '#ffffff' ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: '#ffffff' }}
                  />
                  <button
                    onClick={() => setTextColor('#000000')}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${textColor === '#000000' ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: '#000000' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Media Status */}
          {(statusType === 'image' || statusType === 'video') && (
            <div className="space-y-3">
              {preview ? (
                <div className="relative">
                  {statusType === 'image' ? (
                    <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-xl" />
                  ) : (
                    <video src={preview} className="w-full h-64 object-cover rounded-xl" controls />
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-border rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                  {statusType === 'image' ? (
                    <Image size={48} className="mx-auto text-dark-textSecondary mb-2" />
                  ) : (
                    <Camera size={48} className="mx-auto text-dark-textSecondary mb-2" />
                  )}
                  <p className="text-dark-textSecondary text-sm">
                    Click to {statusType === 'image' ? 'select image' : 'select video'}
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={statusType === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileSelect}
                className="hidden"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add caption..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary-500 resize-none h-20"
              />
            </div>
          )}

          {/* Privacy Selector */}
          <div>
            <label className="text-xs text-dark-textSecondary font-bold uppercase block mb-2">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary-500"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My Contacts</option>
              <option value="contacts_except">My Contacts Except...</option>
              <option value="only_share_with">Only Share With...</option>
              <option value="only_me">Only Me</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || (!content && !file)}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Post Status</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusCreator;
