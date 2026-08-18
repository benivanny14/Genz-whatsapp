import React from 'react';
import { AtSign, BarChart2, CalendarClock, Camera, Clock, Contact, DollarSign, Edit, Eye, FileText, Grid3x3, Headphones, ImageIcon, Languages, MapPin, Paperclip, Radio, Send, ShieldCheck, ShieldOff, Smile, Square, VideoIcon, X } from 'lucide-react';
import MediaPickerPanel from './MediaPickerPanel';
import ReplyMessage from './ReplyMessage';
import StickerPicker from './StickerPicker';
import VoiceRecorder from './VoiceRecorder';
import { FONT_OPTIONS } from '../utils/chatTextHelpers';

/**
 * MessageComposer — the reply bar + media panel + composer form for ChatArea.
 *
 * Extracted verbatim from ChatArea.jsx (lines 2885-3183). Receives a single
 * ctx bundle so the JSX content is untouched; behavior is identical.
 */
const MessageComposer = React.memo(function MessageComposer({ ctx }) {
  const {
    replyingTo, setReplyingTo, showMediaPanel, setShowMediaPanel,
    activeMediaTab, setActiveMediaTab, handleEmojiClick,
    setSelectedMedia, selectedMedia, editingMessage, setEditingMessage,
    setMessageInput, messageInput, inputRef, voiceRecorderActive,
    setVoiceRecorderActive, handleFormatText, handleSendMessage,
    showAttachmentMenu, setShowAttachmentMenu, isViewOnceEnabled,
    setIsViewOnceEnabled, allowScreenshotEnabled, setAllowScreenshotEnabled,
    handleSchedule, attachmentMenuRef, docInputRef,
    canSendMedia, currentUserIsAdmin, openCamera, fileInputRef,
    openAudioAttachment, openVideoNoteRecorder, handleShareLocation,
    handleContactSimulation, canCreatePolls, setShowPollModal,
    handleSetDisappearingMessages, selectedConversation,
    setFloatingStickerMode, setShowPaymentModal, mentionState,
    mentionSuggestions, selectMention, handleFileUpload, audioInputRef,
    cameraInputRef, adminOnlyMessagingEnabled, handleTyping,
    handleMentionKeyDown, closeMentionPicker, selectedFont,
    setShowFontPicker, showFontPicker, handleVoiceNoteSend, safeMods,
    sendRecordingStatus, sendButtonRef, showStickerPacks, setShowStickerPacks,
    floatingStickerMode, handleSendStickerWithCaption, AttachmentIcon
  } = ctx;

  return (
    <>
  {replyingTo && (
          <div className="bg-dark-surface border-t border-dark-border px-4 py-2 relative z-10">
            <ReplyMessage replyTo={replyingTo} onCancel={() => setReplyingTo(null)} isReplying />
          </div>
        )}
  
        <div className="bg-dark-surface border-t border-dark-border px-2 py-2 md:p-4 relative z-20 flex-shrink-0" style={{ flex: '0 0 auto', position: 'relative' }}>
          {showMediaPanel && (
            <div className="absolute bottom-full left-0 right-0 w-full z-50 overflow-hidden shadow-2xl border-t border-dark-border">
              <MediaPickerPanel
                activeTab={activeMediaTab}
                onTabChange={setActiveMediaTab}
                onEmojiSelect={handleEmojiClick}
                onStickerSelect={(stickerUrl, options = {}) => {
                  // TikTok-style: sticker previews in the input so the user can
                  // keep typing; Send delivers sticker + text as ONE message.
                  setSelectedMedia({ type: 'sticker', url: stickerUrl, options });
                  setShowMediaPanel(false);
                }}
              />
            </div>
          )}
  
          {showStickerPacks && (
            <div className="absolute bottom-full left-0 right-0 w-full z-50 overflow-hidden shadow-2xl border-t border-dark-border">
              <StickerPicker
                onStickerSelect={(stickerUrl, options) => {
                  if (floatingStickerMode) {
                    // Floating mode keeps the instant fly-across-screen behavior
                    handleSendStickerWithCaption(stickerUrl, { ...options, isFloating: true });
                  } else {
                    // TikTok-style: stage the sticker in the input preview; Send
                    // delivers sticker + typed text together as one bubble.
                    setSelectedMedia({ type: 'sticker', url: stickerUrl, options });
                  }
                  setShowStickerPacks(false);
                }}
                onClose={() => setShowStickerPacks(false)}
              />
            </div>
          )}
  
          {selectedMedia && (
            <div className="mb-2 relative inline-block bg-dark-bg p-2 rounded-xl border border-dark-border max-w-[200px]">
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
              >
                <X size={14} />
              </button>
              <img src={selectedMedia.url} alt="selected media" className="w-full h-auto rounded-lg max-h-32 object-contain" />
              {selectedMedia.type === 'sticker' && (
                <p className="text-[10px] text-dark-textSecondary mt-1 text-center">
                  {messageInput.trim()
                    ? 'Sticker will be sent with your message ✨'
                    : 'Sticker will be sent alone'}
                </p>
              )}
            </div>
          )}
  
          {/* Editing-message indicator */}
          {editingMessage && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#182229] border border-dark-border rounded-t-xl border-b-0 -mb-px self-end z-50">
              <Edit size={14} className="text-[#25d366]" />
              <span className="text-xs text-gray-300">Editing message</span>
              <button
                type="button"
                onClick={() => { setEditingMessage(null); setMessageInput(''); inputRef.current?.focus(); }}
                className="ml-1 text-gray-400 hover:text-white transition-colors"
                title="Cancel editing"
                aria-label="Cancel editing"
              >
                <X size={14} />
              </button>
            </div>
          )}
  
          {/* WhatsApp-style text formatting toolbar (shows while typing) */}
          {!voiceRecorderActive && messageInput.trim() && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-dark-surface border border-dark-border rounded-t-xl border-b-0 -mb-px self-end z-50" role="toolbar" aria-label="Text formatting">
              <span className="text-[10px] uppercase tracking-wide text-dark-textSecondary mr-1 hidden sm:inline">Format</span>
              <button
                type="button"
                onClick={() => handleFormatText('*')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-dark-text font-bold hover:bg-dark-hover transition-colors"
                title="Bold (*text*)"
                aria-label="Bold"
              >B</button>
              <button
                type="button"
                onClick={() => handleFormatText('_')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-dark-text italic hover:bg-dark-hover transition-colors"
                title="Italic (_text_)"
                aria-label="Italic"
              >I</button>
              <button
                type="button"
                onClick={() => handleFormatText('~')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-dark-text hover:bg-dark-hover transition-colors"
                title="Strikethrough (~text~)"
                aria-label="Strikethrough"
              ><span className="line-through">S</span></button>
              <button
                type="button"
                onClick={() => handleFormatText('`')}
                className="w-8 h-8 flex items-center justify-center rounded-lg font-mono text-sm text-dark-text hover:bg-dark-hover transition-colors"
                title="Monospace (`text`)"
                aria-label="Monospace"
              >&lt;/&gt;</button>
            </div>
          )}
  
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 p-1.5 md:p-3 bg-dark-bg border border-dark-border rounded-2xl flex-shrink-0 z-50" role="form" aria-label="Send message">
            {!voiceRecorderActive && (
              <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar max-w-[112px] sm:max-w-[160px] md:max-w-none flex-shrink-0 snap-x">
                <button
                  type="button"
                  onClick={() => setShowMediaPanel(!showMediaPanel)}
                  className={`p-3 rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${showMediaPanel ? 'bg-primary-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                  title="Emoji & Media"
                  aria-label="Toggle media picker"
                  aria-expanded={showMediaPanel}
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMediaPanel(false); setShowStickerPacks(!showStickerPacks); }}
                  className={`p-3 rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${showStickerPacks ? 'bg-primary-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                  title="Stickers (send with text)"
                  aria-label="Open sticker picker"
                  aria-expanded={showStickerPacks}
                >
                  <Square className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`p-3 rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${showAttachmentMenu ? 'bg-primary-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                  title="Attachments"
                  aria-label="Open attachment menu"
                  aria-expanded={showAttachmentMenu}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                  className={`p-3 rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${isViewOnceEnabled ? 'bg-purple-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                  title="Send as View Once"
                  aria-label="Toggle view-once mode"
                  aria-pressed={isViewOnceEnabled}
                >
                  <Eye size={20} />
                </button>
                {isViewOnceEnabled && (
                  <button
                    type="button"
                    onClick={() => setAllowScreenshotEnabled(!allowScreenshotEnabled)}
                    className={`p-3 rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${allowScreenshotEnabled ? 'hover:bg-dark-hover text-dark-text' : 'bg-emerald-600 text-white'}`}
                    title={allowScreenshotEnabled ? 'Screenshot protection OFF — receivers may screenshot this view-once message' : 'Screenshot protection ON — receivers cannot screenshot this view-once message'}
                    aria-label="Toggle screenshot protection for view-once message"
                    aria-pressed={!allowScreenshotEnabled}
                  >
                    {allowScreenshotEnabled ? <ShieldOff size={20} /> : <ShieldCheck size={20} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Schedule button clicked, calling handleSchedule');
                    handleSchedule();
                    console.log('handleSchedule called, showScheduleModal should be true');
                  }}
                  className="p-3 hover:bg-dark-hover rounded-lg transition-colors snap-center shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Schedule Message" aria-label="Schedule Message"
                >
                  <CalendarClock className="w-5 h-5 text-dark-text" />
                </button>
              </div>
            )}
            {showAttachmentMenu && (
              <div ref={attachmentMenuRef} className="absolute bottom-14 left-2 right-2 md:left-0 md:right-auto md:w-max md:max-w-2xl bg-dark-surface border border-dark-border rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 md:flex md:flex-row md:flex-wrap md:gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <AttachmentIcon icon={<FileText className="text-blue-500" />} label="Document" onClick={() => { setShowAttachmentMenu(false); docInputRef.current?.click(); }} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon
                  icon={<Camera className="text-pink-500" />}
                  label="Camera"
                  onClick={() => { setShowAttachmentMenu(false); openCamera(); }}
                  disabled={!canSendMedia && !currentUserIsAdmin}
                  title="Camera (Emulator may need permission)"
                />
                <AttachmentIcon icon={<ImageIcon className="text-purple-500" />} label="Gallery" onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<Headphones className="text-orange-500" />} label="Audio" onClick={() => { setShowAttachmentMenu(false); openAudioAttachment(); }} disabled={!canSendMedia && !currentUserIsAdmin} title="Audio (Emulator may need permission)" />
                <AttachmentIcon icon={<VideoIcon className="text-cyan-500" />} label="Video Note" onClick={() => openVideoNoteRecorder()} disabled={!canSendMedia && !currentUserIsAdmin} title="Record a short circular video note (like WhatsApp)" />
                <AttachmentIcon icon={<MapPin className="text-green-500" />} label="Location" onClick={() => { setShowAttachmentMenu(false); handleShareLocation('current'); }} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<MapPin className="text-red-500" />} label="Live Loc." onClick={() => { setShowAttachmentMenu(false); handleShareLocation('live'); }} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<Contact className="text-blue-400" />} label="Contact" onClick={() => { setShowAttachmentMenu(false); handleContactSimulation(); }} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<BarChart2 className="text-yellow-600" />} label="Poll" disabled={!canCreatePolls && !currentUserIsAdmin} onClick={() => { setShowAttachmentMenu(false); setShowPollModal(true); }} />
                <AttachmentIcon icon={<Clock className="text-purple-600" />} label="Disappear" onClick={() => { setShowAttachmentMenu(false); handleSetDisappearingMessages(); }} disabled={!selectedConversation} />
                {/* GENZ Ultra Attachments */}
                  <AttachmentIcon icon={<Grid3x3 className="text-pink-400" />} label={floatingStickerMode ? "Stickers (Float)" : "Stickers"} onClick={() => { setShowStickerPacks(true); setShowAttachmentMenu(false); }} title={floatingStickerMode ? "Floating sticker mode ON" : ""} />
                  <AttachmentIcon icon={<Radio size={16} className={floatingStickerMode ? "text-green-400" : "text-gray-500"} />} label="Float" onClick={() => { setShowAttachmentMenu(false); setFloatingStickerMode(!floatingStickerMode); }} title={floatingStickerMode ? "Disable floating stickers" : "Enable floating stickers (TikTok style)"} />
                  <AttachmentIcon icon={<DollarSign className="text-green-500" />} label="Pay" onClick={() => { setShowAttachmentMenu(false); setShowPaymentModal(true); }} disabled={!selectedConversation} title="TM WhatsApp Pay" />
              </div>
            )}
            {/* Quick emoji feature removed as requested */}
            {mentionState.open && mentionSuggestions.length > 0 && !showAttachmentMenu && (
              <div className="absolute bottom-16 left-2 right-2 md:left-40 md:right-auto md:w-80 bg-dark-surface border border-dark-border rounded-xl shadow-xl p-2 z-50" style={{ maxHeight: 'calc(var(--app-height, 100vh) - 250px)' }}>
                <div className="flex items-center gap-2 px-2 pb-2 text-[10px] uppercase tracking-wide text-dark-textSecondary">
                  <AtSign size={12} />
                  Mention
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {mentionSuggestions.map((participant, index) => (
                    <button
                      key={participant._mentionId}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectMention(participant);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${index === mentionState.activeIndex ? 'bg-primary-600/20' : 'hover:bg-white/10'
                        }`}
                      title={`Mention @${participant._mentionName}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-600/20 overflow-hidden flex items-center justify-center text-sm font-semibold text-primary-100">
                        {participant.profilePicture ? (
                          <img src={participant.profilePicture} alt={participant._mentionName} className="w-full h-full object-cover" />
                        ) : (
                          participant._mentionName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-dark-text truncate">{participant._mentionName}</p>
                        <p className="text-xs text-dark-textSecondary truncate">@{participant._mentionName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Hidden file inputs */}
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*,video/*" />
            <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, 'file')} className="hidden" accept=".pdf,.doc,.docx,.txt" />
            <input type="file" ref={audioInputRef} onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" accept="audio/*" />
            <input type="file" ref={cameraInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*,video/*" capture />
  
            {/* ── Text input — hidden while VoiceRecorder is recording ── */}
            {!voiceRecorderActive && (
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={adminOnlyMessagingEnabled && !currentUserIsAdmin}
                  value={messageInput}
                  onChange={(e) => handleTyping(e.target.value, e.target.selectionStart)}
                  onKeyDown={handleMentionKeyDown}
                  onBlur={() => window.setTimeout(closeMentionPicker, 120)}
                  placeholder="Type a message..."
                  style={{ fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.fontFamily || 'sans-serif' }}
                  className="flex-1 min-w-[100px] px-4 py-2.5 bg-dark-bg border border-dark-border rounded-2xl text-dark-text placeholder-dark-textSecondary focus:outline-none focus:border-primary-500 transition-colors text-base md:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowFontPicker(!showFontPicker)}
                  className="p-2.5 bg-dark-bg border border-dark-border rounded-2xl text-dark-text hover:bg-dark-hover transition-colors"
                  title="Change font"
                >
                  <Languages size={18} />
                </button>
              </div>
            )}
  
            {/* ── TM WhatsApp Voice Recorder ── */}
            {((!messageInput.trim() && !selectedMedia) || voiceRecorderActive) && (
              <VoiceRecorder
                onSend={handleVoiceNoteSend}
                canSend={canSendMedia || currentUserIsAdmin}
                ghostMode={safeMods?.ghostMode}
                sendRecordingStatus={sendRecordingStatus}
                onActiveChange={setVoiceRecorderActive}
                voiceEffectMod={safeMods?.voiceEffect ?? 'none'}
                onFallback={() => audioInputRef.current?.click()}
                voiceConstraints={{
                  echoCancellation: safeMods?.voiceEchoCancellation !== false,
                  noiseSuppression: safeMods?.voiceNoiseSuppression !== false,
                  autoGainControl: true
                }}
              />
            )}
  
            {/* ── Send button — hidden while recording; shows when text OR media selected ── */}
            {!voiceRecorderActive && (messageInput.trim() || selectedMedia) && (
              <button
                ref={sendButtonRef}
                type="submit"
                disabled={adminOnlyMessagingEnabled && !currentUserIsAdmin}
                aria-label="Send message"
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-primary-600 hover:bg-primary-500 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-primary-600/30 min-w-[44px] min-h-[44px]"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            )}
          </form>
  
        </div>
    </>
  );
});

export default MessageComposer;
