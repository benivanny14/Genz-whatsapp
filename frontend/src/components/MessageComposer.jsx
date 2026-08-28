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
    setShowContactPicker, canCreatePolls, setShowPollModal,
    handleSetDisappearingMessages, selectedConversation,
    setFloatingStickerMode, setShowPaymentModal, mentionState,
    mentionSuggestions, selectMention, handleFileUpload, audioInputRef,
    cameraInputRef, adminOnlyMessagingEnabled, handleTyping,
    handleMentionKeyDown, closeMentionPicker, selectedFont,
    setShowFontPicker, showFontPicker, handleVoiceNoteSend, safeMods,
    sendRecordingStatus, sendButtonRef, showStickerPacks, setShowStickerPacks,
    floatingStickerMode, handleSendStickerWithCaption, AttachmentIcon
  } = ctx;

  const composerIconButton = 'w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center text-dark-textSecondary hover:text-dark-text hover:bg-dark-hover transition-colors active:scale-95';
  const activeComposerIconButton = 'w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center bg-primary-600 text-white transition-colors active:scale-95';
  const mobileStatusButton = 'h-8 px-2 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95';

  return (
    <>
  {replyingTo && (
          <div className="bg-dark-surface border-t border-dark-border px-4 py-2 relative z-10">
            <ReplyMessage replyTo={replyingTo} onCancel={() => setReplyingTo(null)} isReplying />
          </div>
        )}
  
        <div className="bg-dark-surface border-t border-dark-border px-1 py-1 sm:px-2 sm:py-2 lg:p-4 relative z-20 flex-shrink-0" style={{ flex: '0 0 auto', position: 'sticky', bottom: 0, paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
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
            <div className={`mb-2 relative inline-block p-2 rounded-xl border border-dark-border max-w-[200px] ${selectedMedia.type === 'sticker' ? 'bg-transparent' : 'bg-dark-bg'}`}>
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md z-10"
              >
                <X size={14} />
              </button>
              <img src={selectedMedia.url} alt="selected media" className={`w-full h-auto max-h-32 object-contain ${selectedMedia.type === 'sticker' ? 'rounded-none bg-transparent' : 'rounded-lg'}`} style={selectedMedia.type === 'sticker' ? { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' } : undefined} />
              {selectedMedia.type === 'sticker' && (
                <p className="text-[10px] text-dark-textSecondary mt-1 text-center">
                  Sticker will be sent with your message ✨
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
  
          {isViewOnceEnabled && !voiceRecorderActive && (
            <div className="mb-1 flex items-center justify-end gap-1 px-1">
              <div className="flex max-w-full items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-100 shadow-sm">
                <Eye size={14} className="flex-shrink-0" />
                <span className="truncate text-xs font-medium">View once</span>
                <button
                  type="button"
                  onClick={() => setAllowScreenshotEnabled(!allowScreenshotEnabled)}
                  className={`${mobileStatusButton} ${allowScreenshotEnabled ? 'bg-white/10 text-dark-textSecondary hover:bg-white/15' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                  title={allowScreenshotEnabled ? 'Screenshot protection OFF' : 'Screenshot protection ON'}
                  aria-label="Toggle screenshot protection for view-once message"
                  aria-pressed={!allowScreenshotEnabled}
                >
                  {allowScreenshotEnabled ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  <span className="hidden min-[360px]:inline">{allowScreenshotEnabled ? 'Shield off' : 'Shield on'}</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex w-full items-end gap-2 flex-shrink-0 z-50" role="form" aria-label="Send message">
            {showAttachmentMenu && (
              <div ref={attachmentMenuRef} className="absolute bottom-[calc(100%+8px)] left-2 right-2 md:left-2 md:right-auto md:w-[min(36rem,calc(100vw-1rem))] bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-2 md:p-3 grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-1.5 md:gap-2 z-50 max-h-[min(58vh,420px)] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                <AttachmentIcon icon={<CalendarClock className="text-[#00a884]" />} label="Schedule" onClick={handleSchedule} disabled={!selectedConversation} title="Schedule Message" />
                <AttachmentIcon icon={<Eye className={isViewOnceEnabled ? 'text-white' : 'text-purple-500'} />} label="View Once" onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)} active={isViewOnceEnabled} title="Send as View Once" />
                {isViewOnceEnabled && (
                  <AttachmentIcon
                    icon={allowScreenshotEnabled ? <ShieldOff className="text-gray-400" /> : <ShieldCheck className="text-emerald-400" />}
                    label={allowScreenshotEnabled ? 'Shield Off' : 'Shield On'}
                    onClick={() => setAllowScreenshotEnabled(!allowScreenshotEnabled)}
                    active={!allowScreenshotEnabled}
                    title={allowScreenshotEnabled ? 'Screenshot protection OFF' : 'Screenshot protection ON'}
                  />
                )}
                <AttachmentIcon icon={<Grid3x3 className="text-pink-400" />} label={floatingStickerMode ? "Float Stickers" : "Stickers"} onClick={() => { setShowStickerPacks(true); inputRef.current?.blur(); }} title={floatingStickerMode ? "Floating sticker mode ON" : "Open stickers"} />
                <AttachmentIcon icon={<Radio size={16} className={floatingStickerMode ? "text-green-400" : "text-gray-500"} />} label="Float" onClick={() => setFloatingStickerMode(!floatingStickerMode)} active={floatingStickerMode} title={floatingStickerMode ? "Disable floating stickers" : "Enable floating stickers"} />
                <AttachmentIcon icon={<FileText className="text-blue-500" />} label="Document" onClick={() => docInputRef.current?.click()} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<Camera className="text-pink-500" />} label="Camera" onClick={openCamera} disabled={!canSendMedia && !currentUserIsAdmin} title="Camera (Emulator may need permission)" />
                <AttachmentIcon icon={<ImageIcon className="text-purple-500" />} label="Gallery" onClick={() => fileInputRef.current?.click()} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<Headphones className="text-orange-500" />} label="Audio" onClick={openAudioAttachment} disabled={!canSendMedia && !currentUserIsAdmin} title="Audio (Emulator may need permission)" />
                <AttachmentIcon icon={<VideoIcon className="text-cyan-500" />} label="Video Note" onClick={openVideoNoteRecorder} disabled={!canSendMedia && !currentUserIsAdmin} title="Record a short circular video note" />
                <AttachmentIcon icon={<MapPin className="text-green-500" />} label="Location" onClick={() => handleShareLocation('current')} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<MapPin className="text-red-500" />} label="Live Loc." onClick={() => handleShareLocation('live')} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<Contact className="text-blue-400" />} label="Contact" onClick={() => setShowContactPicker(true)} disabled={!canSendMedia && !currentUserIsAdmin} />
                <AttachmentIcon icon={<BarChart2 className="text-yellow-600" />} label="Poll" disabled={!canCreatePolls && !currentUserIsAdmin} onClick={() => setShowPollModal(true)} />
                <AttachmentIcon icon={<Clock className="text-purple-600" />} label="Disappear" onClick={handleSetDisappearingMessages} disabled={!selectedConversation} />
                <AttachmentIcon icon={<DollarSign className="text-green-500" />} label="Pay" onClick={() => setShowPaymentModal(true)} disabled={!selectedConversation} title="TM WhatsApp Pay" />
              </div>
            )}
            {/* Quick emoji feature removed as requested */}
            {mentionState.open && mentionSuggestions.length > 0 && !showAttachmentMenu && (
              <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 md:left-40 md:right-auto md:w-80 bg-dark-surface border border-dark-border rounded-xl shadow-xl p-2 z-50" style={{ maxHeight: 'calc(var(--app-height, 100vh) - 250px)' }}>
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
              <div className="flex-1 min-w-0 flex items-center gap-1 rounded-[24px] bg-dark-bg border border-dark-border px-1.5 py-1 shadow-sm sm:px-2 sm:py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    setShowStickerPacks(false);
                    const opening = !showMediaPanel;
                    setShowMediaPanel(opening);
                    // WhatsApp behavior: dismiss the phone's native keyboard
                    // when opening the emoji/sticker panel so the panel gets
                    // the full space instead of being squeezed behind it.
                    if (opening) inputRef.current?.blur();
                  }}
                  className={showMediaPanel ? activeComposerIconButton : composerIconButton}
                  title="Emoji & Media"
                  aria-label="Toggle media picker"
                  aria-expanded={showMediaPanel}
                >
                  <Smile className="w-5 h-5" />
                </button>
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
                  onFocus={() => {
                    // Tapping the text field again should bring back the
                    // native keyboard and hide the emoji/sticker panel, just
                    // like WhatsApp does.
                    if (showMediaPanel) setShowMediaPanel(false);
                    if (showStickerPacks) setShowStickerPacks(false);
                  }}
                  onBlur={() => window.setTimeout(closeMentionPicker, 120)}
                  placeholder="Type a message..."
                  style={{ fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.fontFamily || 'sans-serif' }}
                  className="h-10 flex-1 min-w-[3rem] bg-transparent px-1 py-2 text-base text-dark-text placeholder-dark-textSecondary focus:outline-none sm:min-w-[5rem] sm:px-1.5 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowMediaPanel(false);
                    setShowAttachmentMenu(false);
                    const opening = !showStickerPacks;
                    setShowStickerPacks(opening);
                    if (opening) inputRef.current?.blur();
                  }}
                  className={`${showStickerPacks ? activeComposerIconButton : composerIconButton} hidden sm:flex`}
                  title="Stickers (send with text)"
                  aria-label="Open sticker picker"
                  aria-expanded={showStickerPacks}
                >
                  <Square className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                  className={`${isViewOnceEnabled ? activeComposerIconButton : composerIconButton} hidden sm:flex`}
                  title="Send as View Once"
                  aria-label="Toggle view-once mode"
                  aria-pressed={isViewOnceEnabled}
                >
                  <Eye size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFontPicker(!showFontPicker)}
                  className={`${composerIconButton} hidden md:flex`}
                  title="Change font"
                >
                  <Languages size={18} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSchedule();
                  }}
                  className={`${composerIconButton} hidden lg:flex`}
                  title="Schedule Message" aria-label="Schedule Message"
                >
                  <CalendarClock className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMediaPanel(false); setShowStickerPacks(false); setShowAttachmentMenu(!showAttachmentMenu); }}
                  className={showAttachmentMenu ? activeComposerIconButton : composerIconButton}
                  title="Attachments"
                  aria-label="Open attachment menu"
                  aria-expanded={showAttachmentMenu}
                >
                  <Paperclip className="w-5 h-5" />
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
                className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 flex items-center justify-center bg-primary-600 hover:bg-primary-500 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-primary-600/30 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px]"
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
