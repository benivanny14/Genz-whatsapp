import React from 'react';
import { CalendarClock, Copy, Languages, Mic, Send, Square, Trash2, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AudioPlayer from './AudioPlayer';
import ChunkedUploader from './ChunkedUploader';
import ContactInfo from './ContactInfo';
import ContactPickerModal from './ContactPickerModal';
import DrawingPanel from './DrawingPanel';
import CropRotatePanel from './CropRotatePanel';
import LeafletMap from './LeafletMap';
import FilePreview from './FilePreview';
import ForwardDialog from './ForwardDialog';
import GroupInfo from './GroupInfo';
import MediaGallery from './MediaGallery';
import MediaViewer from './MediaViewer';
import MessageContextMenu from './MessageContextMenu';
import MessageInfo from './MessageInfo';
import PaymentRequestModal from './PaidFeatures/PaymentRequestModal';
import PollModal from './PollModal';
import ProductCatalogue from './ProductCatalogue';
import ReportDialog from './ReportDialog';
import SearchMessages from './SearchMessages';
import { DISAPPEARING_OPTIONS } from '../utils/chatTextHelpers';
import { FONT_OPTIONS } from '../utils/chatTextHelpers';

/**
 * ChatModals — the modal layer (forward, search, gallery, context menu,
 * media viewer, message info, polls, schedule, camera, audio, location,
 * contact info, etc.) for ChatArea.
 *
 * Extracted verbatim from ChatArea.jsx (lines 2658-3411). Receives a single
 * ctx bundle so the JSX content is untouched; behavior is identical.
 */
const ChatModals = React.memo(function ChatModals({ ctx }) {
  const {
    showForwardModal, forwardingMessage, setShowForwardModal, setForwardingMessage,
    showSearchMessages, setShowSearchMessages,
    showMediaGallery, setShowMediaGallery,
    messageContextMenu, handleContextMenuDelete, handleEditClick,
    setMessageContextMenu, setReplyingTo, handleContextMenuStar,
    unpinMessage, pinMessage, addReaction, plaintextOf,
    handleReplyPrivately,
    textSelectionMenu, textSelectionMenuRef, handleCopySelection,
    handleSelectAllSelection, handleFormatSelection, setTextSelectionMenu,
    reportTarget, setReportTarget,
    showProductCatalogue, setShowProductCatalogue, sendMessage,
    replyingTo,
    showContactPicker, setShowContactPicker, handleShareContact, handleContactSelect,
    viewerMedia, setViewerMedia, viewProfile, handleStartChatWithMember,
    showMessageInfoModal, messageInfoId, setShowMessageInfoModal, setMessageInfoId,
    showPollModal, setShowPollModal, handlePollSubmit,
    showGroupInfo, setShowGroupInfo,
    showFilePreview, previewFile, setShowFilePreview,
    showScheduleModal, setShowScheduleModal, messageInput, scheduleDateTime,
    setScheduleDateTime, confirmSchedule, isDNDMode, isSearching, chatSearchQuery,
    filteredMessages,
    showDrawingEditor, drawingImageUrl, setShowDrawingEditor, setDrawingImageUrl,
    setPendingImageFile, handleDrawingSave,
    showCropEditor, cropImageUrl, setShowCropEditor, setCropImageUrl, handleCropSave,
    showPaymentModal, setShowPaymentModal,
    showFontPicker, setShowFontPicker, setSelectedFont, inputRef, selectedFont,
    showChunkedUploader, setShowChunkedUploader,
    showCameraModal, closeCamera, setCameraMode, cameraMode, recordedVideoUrl,
    videoRef, canvasRef, setRecordedVideoUrl, sendRecordedVideo, capturePhoto,
    isRecordingVideo, videoDuration, stopVideoRecording, startVideoRecording,
    showVideoNoteModal, closeVideoNoteRecorder, recordedVideoNoteUrl,
    videoNotePreviewRef, setRecordedVideoNoteUrl, videoNoteChunksRef,
    sendVideoNote, isRecordingVideoNote, videoNoteDuration,
    stopVideoNoteRecording, startVideoNoteRecording,
    showAudioModal, closeAudioAttachment, recordedAudioUrl, setRecordedAudioUrl,
    sendRecordedAudioAttachment, audioDuration, isRecordingAudio,
    stopAudioAttachmentRecording, startAudioAttachmentRecording,
    showLiveLocationModal, setShowLiveLocationModal, setLiveLocationDuration,
    liveLocationDuration, liveLocationComment, setLiveLocationComment,
    confirmShareLiveLocation,
    showCurrentLocationModal, setShowCurrentLocationModal, currentLocationCoords,
    currentLocationComment, setCurrentLocationComment, confirmShareCurrentLocation,
    viewOnceModalOpen, viewOnceMessageData, closeViewOnceModal, mediaSourceOf,
    showContactInfo, otherUser, setShowContactInfo, setIsSearching, toggleMuteChat,
    blockUser, unblockUser, handleClearCurrentChat, handleDeleteCurrentChat,
    handleExportChat, updateDisappearingMessages, toggleChatLock, safeMods,
    setMods, blockedUsers, showDisappearingPicker, setShowDisappearingPicker,
    applyDisappearingMessages, user, selectedConversation
  } = ctx;

  return (
    <>
  {
          showForwardModal && forwardingMessage && (
            <ForwardDialog
              messageId={forwardingMessage._id || forwardingMessage.id}
              messageContent={typeof forwardingMessage.content === 'string' ? forwardingMessage.content : (forwardingMessage.message || '')}
              conversationId={selectedConversation?._id}
              onClose={() => { setShowForwardModal(false); setForwardingMessage(null); }}
            />
          )
        }
  
        {/* SearchMessages modal */}
        {showSearchMessages && (
          <SearchMessages
            conversationId={selectedConversation?._id}
            onSelectMessage={(msg) => {
              try {
                const id = msg._id || msg.id;
                if (id) {
                  const el = document.getElementById(`msg-${id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              } catch (e) { }
              setShowSearchMessages(false);
            }}
            onClose={() => setShowSearchMessages(false)}
          />
        )}
  
        {/* Media gallery modal */}
        {showMediaGallery && (
          <MediaGallery
            conversationId={selectedConversation?._id}
            onClose={() => setShowMediaGallery(false)}
          />
        )}
  
        {/* Message context menu (right-click) */}
        {messageContextMenu && (
          <MessageContextMenu
            message={messageContextMenu.message}
            position={messageContextMenu.position}
            conversationId={selectedConversation?._id}
            currentUserId={user?.id || user?._id}
            onDelete={() => handleContextMenuDelete(messageContextMenu.message)}
            onEdit={() => {
              handleEditClick(messageContextMenu.message);
              setMessageContextMenu(null);
            }}
            onReply={(msg) => {
              setReplyingTo(msg);
              setMessageContextMenu(null);
            }}
            onToggleStar={() => handleContextMenuStar(messageContextMenu.message)}
            onPin={(msg) => {
              const messageId = msg._id || msg.id;
              if (messageId && selectedConversation?._id) {
                const isPinned = selectedConversation?.pinnedMessages?.includes(messageId);
                if (isPinned) {
                  unpinMessage(messageId);
                } else {
                  pinMessage(messageId);
                }
              }
              setMessageContextMenu(null);
            }}
             onReaction={(messageId, emoji) => addReaction(messageId, emoji)}
             onReplyPrivately={(msg) => handleReplyPrivately(msg)}
             isGroupChat={selectedConversation?.isGroup}
             conversation={selectedConversation}
             onClose={() => setMessageContextMenu(null)}
          />
        )}
  
        {/* WhatsApp-style text-selection menu (select text inside a bubble) */}
        {textSelectionMenu && (
          <>
            <div
              ref={textSelectionMenuRef}
              className="fixed bg-[#1a2332] border border-gray-600 rounded-lg shadow-xl z-[60] px-1 py-1 flex items-center gap-0.5"
              style={{
                top: Math.max(8, (textSelectionMenu.y - 46)) + 'px',
                left: Math.min(Math.max(8, textSelectionMenu.x - 110), window.innerWidth - 230) + 'px',
              }}
              role="menu"
              aria-label="Text selection menu"
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                type="button"
                onClick={handleCopySelection}
                className="px-2 py-1.5 flex items-center gap-1.5 rounded-md hover:bg-gray-700 transition text-xs text-gray-200"
                title="Copy"
                role="menuitem"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                type="button"
                onClick={handleSelectAllSelection}
                className="px-2 py-1.5 flex items-center gap-1.5 rounded-md hover:bg-gray-700 transition text-xs text-gray-200"
                title="Select all"
                role="menuitem"
              >
                Select all
              </button>
              {textSelectionMenu.ownMessage && (
                <>
                  <span className="w-px h-4 bg-gray-600 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => handleFormatSelection('*')}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-700 transition text-sm font-bold text-gray-200"
                    title="Bold"
                    role="menuitem"
                  >B</button>
                  <button
                    type="button"
                    onClick={() => handleFormatSelection('_')}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-700 transition text-sm italic text-gray-200"
                    title="Italic"
                    role="menuitem"
                  >I</button>
                  <button
                    type="button"
                    onClick={() => handleFormatSelection('~')}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-700 transition text-sm text-gray-200"
                    title="Strikethrough"
                    role="menuitem"
                  ><span className="line-through">S</span></button>
                  <button
                    type="button"
                    onClick={() => handleFormatSelection('`')}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-700 transition text-sm font-mono text-gray-200"
                    title="Monospace"
                    role="menuitem"
                  >&lt;/&gt;</button>
                </>
              )}
            </div>
            <div
              className="fixed inset-0 z-[55]"
              onMouseDown={(e) => {
                if (!textSelectionMenuRef.current?.contains(e.target)) {
                  setTextSelectionMenu(null);
                }
              }}
            />
          </>
        )}
  
        {/* Report dialog (sticker messages via the message menu) */}
        {reportTarget && (
          <ReportDialog
            messageId={reportTarget._id || reportTarget.id}
            messageContent={reportTarget.content || 'Sticker'}
            senderInfo={reportTarget.sender}
            onClose={() => setReportTarget(null)}
          />
        )}
  
        {/* Media Viewer */}
        {showProductCatalogue && (
          <ProductCatalogue
            onClose={() => setShowProductCatalogue(false)}
            onSendProduct={(product) => {
              sendMessage(product.name, user?.username, {
                messageType: 'product',
                product: { id: product._id, name: product.name, price: product.price, image: product.image, description: product.description },
                chatId: selectedConversation?._id,
                isGroup: selectedConversation?.isGroup,
                replyTo: replyingTo
              });
              setShowProductCatalogue(false);
              setReplyingTo(null);
            }}
          />
        )}
        {showContactPicker && (
          <ContactPickerModal
            onClose={() => setShowContactPicker(false)}
            onSelect={(contact) => {
              handleContactSelect(contact);
              setShowContactPicker(false);
            }}
          />
        )}
        {viewerMedia && (
          <MediaViewer
            src={viewerMedia.mediaUrl || viewerMedia.content}
            type={viewerMedia.messageType === 'sticker' ? 'image' : viewerMedia.messageType}
            alt={typeof viewerMedia.content === 'string' ? viewerMedia.content : 'Media'}
            onClose={() => setViewerMedia(null)}
          />
        )}
  
        {/* Message Info modal (from header / menu) */}
        {showMessageInfoModal && messageInfoId && (
          <MessageInfo
            messageId={messageInfoId}
            onClose={() => { setShowMessageInfoModal(false); setMessageInfoId(null); }}
          />
        )}
  
        {
          showPollModal && (
            <PollModal
              onClose={() => setShowPollModal(false)}
              onSubmit={handlePollSubmit}
            />
          )
        }
  
        {/* Group Info Panel */}
        <AnimatePresence>
          {showGroupInfo && selectedConversation?.isGroup && (
            <GroupInfo
              group={selectedConversation}
              currentUserId={user?._id || user?.id}
              onClose={() => setShowGroupInfo(false)}
              onViewProfile={viewProfile}
              onStartChat={handleStartChatWithMember}
            />
          )}
        </AnimatePresence>
  
        {showFilePreview && previewFile && (
          <FilePreview
            fileUrl={previewFile.fileUrl}
            fileName={previewFile.fileName}
            onClose={() => setShowFilePreview(false)}
          />
        )}
        {/* \u2500\u2500 Schedule Message Modal (Item 28) \u2500\u2500 */}
        {
          showScheduleModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] backdrop-blur-sm">
              <div className="bg-dark-surface rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-dark-border overflow-hidden">
                <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2"><CalendarClock size={18} /> Schedule Message</h3>
                  <button onClick={() => setShowScheduleModal(false)} className="hover:bg-white/20 p-1 rounded-full">✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
                    <p className="text-xs text-dark-textSecondary mb-1">Message to schedule:</p>
                    <p className="text-sm text-dark-text font-medium truncate">{messageInput}</p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-textSecondary font-bold uppercase block mb-2">Send at:</label>
                    <input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={e => setScheduleDateTime(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowScheduleModal(false)}
                      className="flex-1 py-2 rounded-xl border border-dark-border text-dark-textSecondary hover:bg-dark-hover transition-colors text-sm">
                      Cancel
                    </button>
                    <button type="button" onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[Schedule button] Clicked');
                      confirmSchedule();
                    }}
                      className="flex-1 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-bold">
                      ⏰ Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
  
  
  
        {/* ── DND Mode overlay indicator ── */}
        {
          isDNDMode && (
            <div className="fixed top-4 right-4 bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl z-[999] flex items-center gap-2 animate-pulse">
              🔕 DND Mode Active
            </div>
          )
        }
  
        {/* ── Search results count ── */}
        {
          isSearching && chatSearchQuery && (
            <div className="absolute top-16 left-0 right-0 bg-dark-surface/90 text-center text-xs text-white/70 py-1 z-30 backdrop-blur-sm">
              {filteredMessages?.length || 0} result{filteredMessages?.length !== 1 ? 's' : ''} for "{chatSearchQuery}"
            </div>
          )
        }
  
  
  
         {/* ── Crop / Rotate Editor for chat images ── */}
        {showCropEditor && cropImageUrl && (
          <CropRotatePanel
            image={cropImageUrl}
            onClose={() => {
              setShowCropEditor(false);
              URL.revokeObjectURL(cropImageUrl);
              setCropImageUrl('');
              setPendingImageFile(null);
            }}
            onSave={handleCropSave}
          />
        )}

         {/* ── Drawing / Doodle Editor for chat media ── */}
        {showDrawingEditor && drawingImageUrl && (
          <DrawingPanel
            image={drawingImageUrl}
            onClose={() => {
              setShowDrawingEditor(false);
              URL.revokeObjectURL(drawingImageUrl);
              setDrawingImageUrl('');
              setPendingImageFile(null);
            }}
            onSave={handleDrawingSave}
          />
        )}
  
        {/* ── TM WhatsApp Pay: Payment Request Modal ── */}
        {showPaymentModal && selectedConversation && (
          <PaymentRequestModal
            conversation={selectedConversation}
            onClose={() => setShowPaymentModal(false)}
            onPaymentSent={(request) => {
              setShowPaymentModal(false);
            }}
          />
        )}
  
        {/* ── Font Picker Modal ── */}
        {showFontPicker && (
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center">
            <div className="w-full max-w-md bg-[#0d1f35] rounded-t-3xl shadow-2xl overflow-hidden border-t border-white/10">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white font-bold flex items-center gap-2">
                  <Languages size={18} className="text-blue-400" /> Font Style
                </span>
                <button onClick={() => setShowFontPicker(false)} className="text-white/60 hover:text-white p-1" aria-label="Close"><X size={20} /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => {
                      setSelectedFont(font.value);
                      setShowFontPicker(false);
                      inputRef.current?.focus();
                    }}
                    style={{ fontFamily: font.fontFamily }}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedFont === font.value
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-dark-bg border-dark-border text-dark-text hover:bg-dark-hover'
                    }`}
                  >
                    <span className="text-sm">{font.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
  
        {/* ── GENZ Ultra: Chunked Uploader (10GB files) ── */}
        {showChunkedUploader && (
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <ChunkedUploader
              onComplete={async (fileUrl, fileName) => {
                await sendMessage(fileName || 'Big File', user?.username, {
                  messageType: 'file',
                  mediaUrl: fileUrl,
                  fileName: fileName || 'Big File',
                  replyTo: replyingTo
                });
                setReplyingTo(null);
                setShowChunkedUploader(false);
              }}
              onClose={() => setShowChunkedUploader(false)}
            />
          </div>
        )}
  
        {/* ── Camera / Video Modal ── */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-black z-[1000] flex flex-col">
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <button onClick={closeCamera} className="text-white hover:bg-white/20 p-2 rounded-full" aria-label="Close"><X size={24} /></button>
              <div className="flex gap-4">
                <button onClick={() => setCameraMode('photo')} className={`px-4 py-1 rounded-full font-bold ${cameraMode === 'photo' ? 'bg-primary-600 text-white' : 'bg-white/20 text-white'}`}>Photo</button>
                <button onClick={() => setCameraMode('video')} className={`px-4 py-1 rounded-full font-bold ${cameraMode === 'video' ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>Video</button>
              </div>
              <div className="w-8"></div>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              {recordedVideoUrl ? (
                <video src={recordedVideoUrl} controls className="max-h-full w-full object-contain" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-6 bg-gradient-to-t from-black to-transparent absolute bottom-0 w-full flex justify-center items-center">
              {recordedVideoUrl ? (
                <div className="flex gap-6">
                  <button onClick={() => setRecordedVideoUrl(null)} className="p-4 bg-white/20 text-white rounded-full" aria-label="Delete"><Trash2 size={24} /></button>
                  <button onClick={sendRecordedVideo} className="p-4 bg-primary-600 text-white rounded-full" aria-label="Send"><Send size={24} /></button>
                </div>
              ) : cameraMode === 'photo' ? (
                <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white"></div>
                </button>
              ) : (
                isRecordingVideo ? (
                  <div className="flex items-center gap-6">
                    <div className="text-red-500 font-mono text-xl animate-pulse">{Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}</div>
                    <button onClick={stopVideoRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                      <div className="w-10 h-10 rounded bg-red-600"></div>
                    </button>
                  </div>
                ) : (
                  <button onClick={startVideoRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-600"></div>
                  </button>
                )
              )}
            </div>
          </div>
        )}
  
        {/* ── Video Note Modal (WhatsApp-style circular video) ── */}
        {showVideoNoteModal && (
          <div className="fixed inset-0 bg-black z-[1000] flex flex-col">
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <button onClick={closeVideoNoteRecorder} className="text-white hover:bg-white/20 p-2 rounded-full" aria-label="Close"><X size={24} /></button>
              <span className="text-white font-bold">🎥 Video Note</span>
              <div className="w-8"></div>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
              {recordedVideoNoteUrl ? (
                <video src={recordedVideoNoteUrl} controls autoPlay muted loop className="w-72 h-72 rounded-full object-cover border-4 border-white/20" />
              ) : (
                <video ref={videoNotePreviewRef} autoPlay playsInline muted className="w-72 h-72 rounded-full object-cover" />
              )}
            </div>
            <div className="p-6 bg-gradient-to-t from-black to-transparent absolute bottom-0 w-full flex justify-center items-center gap-6">
              {recordedVideoNoteUrl ? (
                <>
                  <button onClick={() => { setRecordedVideoNoteUrl(null); videoNoteChunksRef.current = []; }} className="p-4 bg-white/20 text-white rounded-full" aria-label="Retake"><Trash2 size={24} /></button>
                  <button onClick={sendVideoNote} className="p-4 bg-primary-600 text-white rounded-full" aria-label="Send"><Send size={24} /></button>
                </>
              ) : isRecordingVideoNote ? (
                <>
                  <div className="text-red-500 font-mono text-xl animate-pulse">{Math.floor(videoNoteDuration / 60)}:{(videoNoteDuration % 60).toString().padStart(2, '0')}</div>
                  <button onClick={stopVideoNoteRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                    <Square className="w-10 h-10 text-red-600 fill-red-600" />
                  </button>
                </>
              ) : (
                <button onClick={startVideoNoteRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600"></div>
                </button>
              )}
            </div>
            {!isRecordingVideoNote && !recordedVideoNoteUrl && (
              <div className="absolute bottom-28 w-full text-center text-white/70 text-sm">Tap the red button to record (max 60s)</div>
            )}
          </div>
        )}
  
        {/* ── Audio Attachment Short-Clip Modal ── */}
        {showAudioModal && (
          <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-dark-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-dark-border">
              <div className="p-4 border-b border-dark-border flex justify-between items-center bg-primary-600/10">
                <h3 className="text-white font-bold flex items-center gap-2"><Mic size={18} className="text-primary-500" /> Record Audio</h3>
                <button onClick={closeAudioAttachment} className="text-white/60 hover:text-white" aria-label="Close"><X size={20} /></button>
              </div>
              <div className="p-8 flex flex-col items-center">
                {recordedAudioUrl ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <audio src={recordedAudioUrl} controls className="w-full" />
                    <div className="flex gap-4 w-full">
                      <button onClick={() => setRecordedAudioUrl(null)} className="flex-1 py-2 bg-dark-bg text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-dark-border"><Trash2 size={16} /> Delete</button>
                      <button onClick={sendRecordedAudioAttachment} className="flex-1 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Send size={16} /> Send</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="text-3xl font-mono text-primary-500">
                      {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                    </div>
                    {isRecordingAudio ? (
                      <button onClick={stopAudioAttachmentRecording} className="w-24 h-24 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center animate-pulse border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                        <Square size={32} className="fill-current" />
                      </button>
                    ) : (
                      <button onClick={startAudioAttachmentRecording} className="w-24 h-24 bg-primary-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(37,211,102,0.3)]" aria-label="Voice message">
                        <Mic size={40} />
                      </button>
                    )}
                    <p className="text-white/50 text-xs">
                      {isRecordingAudio ? "Recording in progress..." : "Tap to start recording"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
  
        {showLiveLocationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111b21] rounded-lg w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-[#2a3942] flex justify-between items-center">
                <h3 className="text-white font-medium text-lg">Share live location</h3>
                <button onClick={() => setShowLiveLocationModal(false)} className="text-[#8696a0] hover:text-white" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="relative h-56 bg-[#0b141a]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-[3px] border-[#00a884] overflow-hidden shadow-lg z-10 bg-[#202c33]">
                    <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-full h-full object-cover" alt="Me" />
                  </div>
                  <div className="absolute rounded-full border-4 border-[#00a884]/30 w-28 h-28 animate-ping"></div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-[#00a884] text-white text-xs px-3 py-2 rounded-lg text-center font-medium shadow-md">
                  Participants in this chat will see your location in real-time
                </div>
              </div>
              <div className="p-4 flex flex-col gap-4 bg-[#111b21]">
                <div>
                  <label className="text-xs text-[#8696a0] font-medium mb-2 block">Share for</label>
                  <div className="flex bg-[#202c33] rounded-lg p-1 gap-1">
                    {[
                      { id: 15, label: '15 minutes' },
                      { id: 60, label: '1 hour' },
                      { id: 480, label: '8 hours' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setLiveLocationDuration(opt.id)}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${liveLocationDuration === opt.id ? 'bg-[#00a884] text-white' : 'text-[#8696a0] hover:text-white'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={liveLocationComment}
                  onChange={(e) => setLiveLocationComment(e.target.value)}
                  placeholder="Add comment"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-lg px-4 py-3 text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884]"
                />
                <div className="flex justify-end mt-2">
                  <button onClick={confirmShareLiveLocation} className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg px-6 py-2.5 flex items-center justify-center" aria-label="Send">
                    <Send size={18} className="mr-2" /> Share live location
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
  
        {showCurrentLocationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111b21] rounded-lg w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-[#2a3942] flex justify-between items-center">
                <h3 className="text-white font-medium text-lg">Send current location</h3>
                <button onClick={() => setShowCurrentLocationModal(false)} className="text-[#8696a0] hover:text-white" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="relative h-56 bg-[#0b141a]">
                {currentLocationCoords ? (
                  <LeafletMap
                    center={{ lat: currentLocationCoords.latitude, lng: currentLocationCoords.longitude }}
                    marker={{ lat: currentLocationCoords.latitude, lng: currentLocationCoords.longitude }}
                    zoom={15}
                    height="100%"
                    showLayerControl
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-[3px] border-[#00a884] overflow-hidden shadow-lg z-10 bg-[#202c33]">
                      <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-full h-full object-cover" alt="Me" />
                    </div>
                    <div className="absolute rounded-full border-4 border-[#00a884]/30 w-28 h-28 animate-pulse"></div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 bg-[#00a884] text-white text-xs px-3 py-2 rounded-lg text-center font-medium shadow-md flex flex-col gap-0.5 z-[1001]">
                  <span className="font-bold">📍 Send this location</span>
                  {currentLocationCoords && (
                    <span className="text-white/90">
                      Accurate to {Math.round(currentLocationCoords.accuracy || 15)} meters
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 flex flex-col gap-4 bg-[#111b21]">
                <input
                  type="text"
                  value={currentLocationComment}
                  onChange={(e) => setCurrentLocationComment(e.target.value)}
                  placeholder="Add caption"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-lg px-4 py-3 text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884]"
                />
                <div className="flex justify-end">
                  <button onClick={confirmShareCurrentLocation} className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg px-6 py-2.5 flex items-center justify-center" aria-label="Send">
                    <Send size={18} className="mr-2" /> Send current location
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* ── View Once Modal ── */}
        {viewOnceModalOpen && viewOnceMessageData && (
          <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center" onClick={closeViewOnceModal}>
            <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <button
                onClick={closeViewOnceModal}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
               aria-label="Close">
                <X size={24} />
              </button>
              
              {/* Content */}
              {viewOnceMessageData.messageType === 'image' ? (
                <img
                  src={mediaSourceOf(viewOnceMessageData)}
                  alt="View Once"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : viewOnceMessageData.messageType === 'video' ? (
                <video
                  src={mediaSourceOf(viewOnceMessageData)}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : viewOnceMessageData.messageType === 'audio' ? (
                <div className="bg-dark-surface p-8 rounded-2xl border border-dark-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary-600/20 flex items-center justify-center">
                      <Mic size={24} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Voice Note</p>
                      <p className="text-dark-textSecondary text-sm">
                        {viewOnceMessageData.duration ? `${Math.floor(viewOnceMessageData.duration / 60)}:${(viewOnceMessageData.duration % 60).toString().padStart(2, '0')}` : ''}
                      </p>
                    </div>
                  </div>
                  <AudioPlayer
                    audioUrl={mediaSourceOf(viewOnceMessageData)}
                    isOwn={false}
                    duration={viewOnceMessageData.duration}
                    autoPlay={true}
                  />
                </div>
              ) : (
                <div className="bg-[#0b141a] p-8 rounded-2xl border border-white/10 max-w-lg mx-4">
                  <p className="text-white text-xl whitespace-pre-wrap break-words text-left leading-relaxed">
                    {plaintextOf(viewOnceMessageData)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
  
        {/* ── Contact Info Panel ── */}
        <AnimatePresence>
          {showContactInfo && (
            <ContactInfo
              contact={otherUser}
              conversation={selectedConversation}
              onClose={() => setShowContactInfo(false)}
              onSearchMessages={() => {
                setShowContactInfo(false);
                setIsSearching(true);
              }}
              onMediaGallery={() => {
                setShowContactInfo(false);
                setShowMediaGallery(true);
              }}
              onMuteChat={toggleMuteChat}
              onBlockUser={blockUser}
              onUnblockUser={unblockUser}
              onClearChat={handleClearCurrentChat}
              onDeleteChat={handleDeleteCurrentChat}
              onExportChat={() => handleExportChat('txt')}
              onToggleDisappearing={updateDisappearingMessages}
              onToggleChatLock={(chatId) => toggleChatLock(chatId, !selectedConversation?.isLocked, '')}
              onWallpaperChange={(chatId, color) => {
                const customWallpapers = { ...(safeMods.customWallpapers || {}) };
                if (color === 'default') {
                  delete customWallpapers[chatId];
                } else {
                  customWallpapers[chatId] = {
                    ...customWallpapers[chatId],
                    wallpaper: color
                  };
                }
                setMods(prev => ({ ...prev, customWallpapers }));
                if (window.toast) window.toast.success('Chat wallpaper applied!');
              }}
              isMuted={selectedConversation?.isMuted}
              isBlocked={blockedUsers?.some(b => String(b._id || b) === String(otherUser?._id))}
              isLocked={selectedConversation?.isLocked}
              currentUserId={user?.id}
              disappearingDuration={selectedConversation?.disappearingMessages?.duration || 'Off'}
            />
          )}
        </AnimatePresence>
  
        {showDisappearingPicker && (
          <div
            className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowDisappearingPicker(false)}
          >
            <div
              className="bg-[#202c33] w-full max-w-xs rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-bold text-base">Disappearing messages</h3>
                <p className="text-white/50 text-xs mt-1">
                  Make new messages disappear after a set time.
                </p>
              </div>
              <div className="py-2">
                {DISAPPEARING_OPTIONS.map((opt) => {
                  const current = selectedConversation?.disappearingMessages?.enabled
                    ? (selectedConversation.disappearingMessages.duration || '24h')
                    : 'Off';
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        applyDisappearingMessages(opt.value);
                        setShowDisappearingPicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors ${
                        current === opt.value ? 'text-[#00a884]' : 'text-white'
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                      {current === opt.value ? (
                        <div className="w-5 h-5 rounded-full border-2 border-[#00a884] flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#00a884]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
    </>
  );
});

export default ChatModals;
