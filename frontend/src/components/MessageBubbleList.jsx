import React from 'react';
import { Clock, Contact, Copy, Download, Edit, Eye, EyeOff, Flag, Forward, Heart, Info, MoreVertical, Pin, Reply, ShieldCheck, Star, Trash2 } from 'lucide-react';
import FormattedText from './FormattedText';
import SignedMedia from './SignedMedia';
import AudioPlayer from './AudioPlayer';
import DocumentMessage from './DocumentMessage';
import LeafletMap from './LeafletMap';
import StickerImage, { hasEmojiChar } from './StickerImage';
import { renderTextWithMentions, LinkPreviewCard } from '../utils/chatText';
import { extractFirstUrl, FONT_OPTIONS } from '../utils/chatTextHelpers';
import { formatMessageTime } from '../utils/formatDate';
import toast from 'react-hot-toast';

/**
 * MessageBubbleList — the per-message bubble rendering for ChatArea.
 *
 * Extracted verbatim from ChatArea.jsx (the filteredMessages slice().map()
 * expression). Receives a single ctx bundle so the JSX content is untouched;
 * behavior is identical to the inline block.
 */
const MessageBubbleList = React.memo(function MessageBubbleList({ ctx }) {
  const {
    filteredMessages, visibleCount, safeMods, user, selectedConversation, messages,
    translatedMessages, favoriteStickers, activeMessageMenu, messageMenuRef,
    isOwnMessage, handleDoubleClick, setMessageContextMenu, setActiveMessageMenu,
    openViewOnceModal, setViewerMedia, mediaSourceOf, isVideoSticker,
    plaintextOf, e2eeKeyInfoOf, votePoll, markViewOnceViewed, toggleMessageLock,
    handleRetryMessage, handleReaction, setReplyingTo, setForwardingMessage,
    setShowForwardModal, unpinMessage, pinMessage, toggleStarMessage,
    toggleFavoriteSticker, setReportTarget, handleEditClick, setMessageInfoId,
    setShowMessageInfoModal, deleteMessage, handleDeleteForEveryone
  } = ctx;

  return (filteredMessages || []).slice(-visibleCount).map((message, index) => (
                message.messageType === 'system' ? (
                  <div key={message.id || message._id} className="flex justify-center my-2">
                    <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[85%]">
                      <FormattedText text={typeof message.content === 'string' ? message.content : ''} />
                    </span>
                  </div>
                ) : (
                <div
                  id={`msg-${message.id || message._id}`}
                  key={message.id || message._id}
                  className={`flex w-full ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMessageContextMenu({
                      message,
                      position: { x: e.clientX, y: e.clientY }
                    });
                  }}
                  onDoubleClick={() => handleDoubleClick(message._id || message.id)}
                >
                  <div
                    className={`max-w-[75%] relative group shadow-sm transition-all duration-300 ${(message.messageType === 'audio' || message.messageType === 'voice' || message.messageType === 'sticker')
                      ? 'bg-transparent p-0'
                      : `px-4 py-2 ${safeMods?.bubbleStyle === 'sharp' ? 'rounded-none' :
                        safeMods?.bubbleStyle === 'bubble' ? 'rounded-3xl' :
                          safeMods?.bubbleStyle === 'rounded' ? 'rounded-2xl' :
                            safeMods?.bubbleStyle === 'ios' ? 'rounded-[20px]' :
                              'rounded-2xl'
                      } ${isOwnMessage(message)
                        ? 'bg-primary-600 text-white rounded-tr-none ml-12'
                        : 'bg-dark-surface text-dark-text rounded-tl-none mr-12'}`
                      }`}
                    onClick={(e) => {
                      // Removed double menu action on regular click, letting users use the 3-dot menu or long press
                      setActiveMessageMenu(null);
                    }}
                    style={
                      (message.messageType !== 'audio' && message.messageType !== 'voice' && message.messageType !== 'sticker')
                        ? {
                          backgroundColor: isOwnMessage(message)
                            ? (safeMods?.bubbleSentColor || undefined)
                            : (safeMods?.bubbleReceivedColor || undefined)
                        }
                        : {}
                    }
                  >
                    {message.isAdmin && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-primary-600 mb-1 bg-white/90 px-2 py-0.5 rounded-full w-fit shadow-sm border border-primary-200">
                        <ShieldCheck size={10} className="text-primary-600" /> GENZ ADMIN
                      </div>
                    )}
                    {/* ── Forwarded label (WhatsApp style) ── */}
                    {message.isForwarded && !safeMods?.noForwardLabel && (
                      <p className="text-[10px] text-[#8696a0] italic flex items-center gap-1 mb-1">
                        <Forward size={10} /> Forwarded
                      </p>
                    )}

                    {/* ── Quoted Reply (click to scroll to original) ── */}
                    {message.replyTo && (
                      <div 
                        className="mb-2 bg-black/20 border-l-4 border-[#25d366] rounded-lg p-2 text-xs cursor-pointer hover:bg-black/30 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const replyId = message.replyTo?._id || message.replyTo?.id;
                          if (replyId) {
                            const el = document.getElementById(`msg-${replyId}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('bg-white/10', 'transition-colors', 'duration-500');
                              setTimeout(() => el.classList.remove('bg-white/10'), 2000);
                            }
                          }
                        }}
                      >
                        <p className="text-[#25d366] font-bold mb-0.5 text-[11px]">
                          {message.replyTo.sender?.username || message.replyTo.sender?.name || message.replyTo.senderName || 'User'}
                        </p>
                        {(message.replyTo.messageType === 'image' || message.replyTo.mediaUrl?.match(/\.(jpg|jpeg|png|webp)/i)) && (
                          <div className="flex items-center gap-2 mb-1">
                            <img src={message.replyTo.mediaUrl} alt="reply" className="w-10 h-10 rounded object-cover" onError={e=>{e.target.style.display='none'}} />
                            <p className="text-white/70 truncate">📷 Photo</p>
                          </div>
                        )}
                        {message.replyTo.messageType !== 'image' && (
                          <p className="text-white/70 truncate">
                            {message.replyTo.messageType === 'voice' || message.replyTo.messageType === 'audio' ? '🎤 Voice message'
                              : message.replyTo.messageType === 'video' ? '🎥 Video'
                              : message.replyTo.messageType === 'file' ? '📎 File'
                              : typeof message.replyTo.content === 'string'
                                ? <FormattedText text={message.replyTo.content?.substring(0, 60) + (message.replyTo.content?.length > 60 ? '...' : '')} />
                              : 'Reply'}
                          </p>
                        )}
                      </div>
                    )}
                    {/* ── Quoted Status Reply (WhatsApp style) ── */}
                    {message.quotedStatus?.statusId && (
                      <div className="mb-2 bg-black/25 border-l-4 border-[#25d366] rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#25d366] font-bold text-[11px] mb-1">
                          <span>📸</span>
                          <span>{typeof message.quotedStatus.ownerName === 'string' ? message.quotedStatus.ownerName : 'Status'}</span>
                        </div>
                        {message.quotedStatus.mediaUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={message.quotedStatus.mediaUrl} alt="Status" className="w-10 h-10 rounded object-cover" onError={e => { e.target.style.display = 'none'; }} />
                            <p className="text-white/60 text-[11px] truncate">{typeof message.quotedStatus.preview === 'string' ? message.quotedStatus.preview : 'Status'}</p>
                          </div>
                        ) : (
                          <p className="text-white/60 italic truncate">{typeof message.quotedStatus.preview === 'string' ? message.quotedStatus.preview : '📸 Status'}</p>
                        )}
                      </div>
                    )}
                    {/* ── Forwarded Label ── */}
                    {message.isForwarded && !safeMods?.noForwardLabel && (
                      <div className="flex items-center gap-1 text-[10px] opacity-60 italic mb-1">
                        <Forward size={10} /> Forwarded
                      </div>
                    )}

                    {/* 📽️ Video Message 📽️ */}
                    {message.messageType === 'video' && mediaSourceOf(message) && (
                      (message.isViewOnce || message.isSelfDestruct) && !safeMods.antiViewOnce && message.isConsumed ? (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> {message.isSelfDestruct ? 'Self-destructed' : 'Opened'}
                        </div>
                      ) : (message.isViewOnce || message.isSelfDestruct) && !safeMods.antiViewOnce ? (
                        <div className="relative mb-1">
                          {/* Placeholder for View Once video - don't load actual video until clicked */}
                          <div
                            className="max-w-full rounded-lg max-h-64 w-full cursor-pointer bg-dark-bg/50 border-2 border-dashed border-dark-border/50 flex items-center justify-center min-h-[200px]"
                            onClick={() => { if (!isOwnMessage(message)) openViewOnceModal(message); }}
                          >
                            <div className="flex flex-col items-center gap-2 text-dark-textSecondary">
                              <Eye size={32} />
                              <span className="text-sm font-medium">{isOwnMessage(message) ? 'View once' : 'Tap to view'}</span>
                              <span className="text-xs opacity-60">View once video</span>
                            </div>
                          </div>
                        </div>
                      ) : message.isVideoNote ? (
                        <div
                          className="mb-1 cursor-pointer flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewerMedia(message);
                          }}
                          title="Video note"
                        >
                          <SignedMedia
                            as="video"
                            src={mediaSourceOf(message)}
                            controls
                            autoPlay={false}
                            muted
                            loop
                            playsInline
                            className="w-44 h-44 md:w-52 md:h-52 rounded-full object-cover border-2 border-dark-border shadow-lg"
                            preload="metadata"
                          />
                          {message.duration > 0 && (
                            <span className="ml-2 text-[10px] text-dark-textSecondary">{Math.floor(message.duration / 60)}:{String(message.duration % 60).padStart(2, '0')}</span>
                          )}
                        </div>
                      ) : (
                        <div
                          className="mb-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewerMedia(message);
                          }}
                        >
                          <SignedMedia
                            as="video"
                            src={mediaSourceOf(message)}
                            controls
                            className="max-w-full rounded-lg max-h-64 w-full"
                            preload="metadata"
                          />
                          {message.caption && <p className="text-xs mt-1 opacity-80">{typeof message.caption === 'string' ? message.caption : 'Caption'}</p>}
                        </div>
                      )
                    )}

                    {/* ── Sticker Message (WhatsApp style: no bubble, compact sticker, tiny time overlay) ── */}
                    {message.messageType === 'sticker' && (
                      <div className="mb-1" style={{ animation: 'stickerBounce 0.4s ease-out' }}>
                        <div className="relative w-fit">
                          {isVideoSticker(message) ? (
                            <video
                              src={message.content || message.mediaUrl}
                              className="w-full max-w-[150px] h-auto object-contain cursor-pointer rounded-sm"
                              muted
                              autoPlay
                              loop
                              playsInline
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewerMedia(message);
                              }}
                            />
                          ) : (
                            <StickerImage
                              src={message.content || message.mediaUrl}
                              emoji={hasEmojiChar(message.caption) ? message.caption : undefined}
                              alt={typeof message.content === 'string' ? message.content : 'Sticker'}
                              className="w-full max-w-[150px] h-auto object-contain cursor-pointer"
                              fallbackClassName="text-6xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewerMedia(message);
                              }}
                            />
                          )}
                          {/* WhatsApp-style tiny time overlay at the bottom of the sticker */}
                          <span className="absolute bottom-1 right-1.5 text-[10px] leading-none text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none">
                            {formatMessageTime(message.createdAt)}
                            {isOwnMessage(message) && message.status !== 'failed' && message.status !== 'pending' && message.status !== 'sending' && (
                              <span>{message.status === 'sent' ? ' ✓' : ' ✓✓'}</span>
                            )}
                          </span>
                        </div>
                        {message.caption && (
                          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{message.caption}</p>
                        )}
                      </div>
                    )}

                    {/* ── Image Message ── */}
                    {message.messageType === 'image' && (
                      (message.isViewOnce || message.isSelfDestruct) && !safeMods.antiViewOnce && message.isConsumed ? (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> {message.isSelfDestruct ? 'Self-destructed' : 'Opened'}
                        </div>
                      ) : (message.isViewOnce || message.isSelfDestruct) && !safeMods.antiViewOnce ? (
                        <div className="relative">
                          {/* Placeholder for View Once media - don't load actual image until clicked */}
                          <div
                            className="max-w-full rounded-lg cursor-pointer bg-dark-bg/50 border-2 border-dashed border-dark-border/50 flex items-center justify-center min-h-[200px]"
                            onClick={() => { if (!isOwnMessage(message)) openViewOnceModal(message); }}
                          >
                            <div className="flex flex-col items-center gap-2 text-dark-textSecondary">
                              <Eye size={32} />
                              <span className="text-sm font-medium">{isOwnMessage(message) ? 'View once' : 'Tap to view'}</span>
                              <span className="text-xs opacity-60">View once message</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          setViewerMedia(message);
                        }}>
                          <SignedMedia
                            src={mediaSourceOf(message)}
                            alt={typeof message.content === 'string' ? message.content : 'Image'}
                            className="max-w-full rounded-lg"
                            loading="lazy"
                          />
                          {message.caption && <p className="text-xs mt-1 opacity-80">{typeof message.caption === 'string' ? message.caption : 'Caption'}</p>}
                          <button onClick={(e) => {
                            e.stopPropagation();
                            window.open(mediaSourceOf(message), '_blank');
                          }} className="mt-2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs hover:bg-primary-700">
                            Download
                          </button>
                        </div>
                      )
                    )}
                    {message.isViewOnce && safeMods.antiViewOnce && (
                      <div className="flex items-center gap-1 text-[9px] text-purple-500 font-bold uppercase mb-1">
                        <EyeOff size={10} /> View Once (Anti-Delete)
                      </div>
                    )}
                    {message.messageType === 'file' && (
                      <DocumentMessage
                        fileName={message.fileName || 'File'}
                        fileSize={message.fileSize}
                        fileUrl={message.mediaUrl}
                        messageType={message.messageType}
                      />
                    )}
                    {message.messageType === 'poll' && message.poll && (
                      <div className="mb-2 min-w-[250px] bg-dark-bg/20 p-3 rounded-xl border border-dark-border/50">
                        <p className="font-bold text-dark-text mb-3">{typeof message.poll.question === 'string' ? message.poll.question : 'Poll Question'}</p>
                        <div className="space-y-2">
                          {message.poll.options?.map((option, idx) => {
                            const totalVotes = message.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
                            const optionVotes = option.votes?.length || 0;
                            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            const userId = user?._id || user?.id;
                            const hasVoted = option.votes?.some((v) => String(v) === String(userId));

                            return (
                              <button
                                key={idx}
                                onClick={() => votePoll(message.id || message._id, idx)}
                                className={`w-full p-3 rounded-lg text-left transition-all ${hasVoted ? 'bg-primary-600 text-white' : 'bg-dark-bg/50 hover:bg-dark-bg/80 text-dark-text'
                                  }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium">{option.text}</span>
                                  <span className="text-sm">{percentage}%</span>
                                  <span className="opacity-60">{option.votes?.length || 0} votes</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
{message.messageType === 'location' && (() => {
                       const isLive = Boolean(message.isLiveLocation) &&
                         (!message.liveLocationExpiresAt || new Date(message.liveLocationExpiresAt) > new Date());
                       const lat = typeof message.latitude === 'number' ? message.latitude : null;
                       const lng = typeof message.longitude === 'number' ? message.longitude : null;
                       const mapsUrl = lat && lng
                         ? `https://www.google.com/maps?q=${lat},${lng}&layer=c`
                         : (plaintextOf(message).match(/https?:\/\/\S+/) || [null])[0];
                       const addressText = message.caption || (lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '');
                       const timeRemaining = isLive && message.liveLocationExpiresAt
                         ? (() => { const diff = new Date(message.liveLocationExpiresAt) - new Date(); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m`; })()
                         : null;
                       return (
                         <div className="mb-1 w-[260px] rounded-lg overflow-hidden bg-[#0b141a] shadow-sm relative group cursor-pointer" onClick={() => { if (mapsUrl) window.open(mapsUrl, '_blank'); }}>
                       {/* Real Interactive Map Preview (Leaflet + OpenStreetMap tiles) */}
                       <div className="relative h-48 overflow-hidden">
                         <LeafletMap
                           center={lat && lng ? { lat, lng } : undefined}
                           marker={lat && lng ? { lat, lng } : null}
                           live={isLive}
                           zoom={15}
                           height="100%"
                           showLayerControl
                           onClick={() => { if (mapsUrl) window.open(mapsUrl, '_blank'); }}
                         />
                         {/* Live Timer Badge */}
                         {timeRemaining && (
                           <div className="absolute top-2 right-2 bg-[#00a884] text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 z-[500]">
                             <Clock size={10} /> {timeRemaining}
                           </div>
                         )}
                       </div>
                           {/* Bottom Bar Info */}
                           <div className="bg-[#111b21] p-3 flex flex-col border-t border-[#2a3942]">
                             <p className="text-sm font-bold text-white truncate">
                               {isLive ? 'Live location' : 'Location'}
                             </p>
                             {addressText && (
                               <p className="text-xs text-[#8696a0] truncate mt-0.5">{addressText}</p>
                             )}
                             <span className="text-xs text-[#00a884] mt-1 truncate hover:underline">
                               Open in Maps
                             </span>
                           </div>
                         </div>
                       );
                     })()}
                    {(message.messageType === 'audio' || message.messageType === 'voice') && (() => {
                      // Find sender info for avatar
                      const sender = selectedConversation?.participants?.find(
                        p => p._id === (message.sender?._id || message.sender)
                      );
                      const senderAvatar = sender?.profilePicture || message.sender?.profilePicture || null;
                      const senderName = sender?.username || message.sender?.username || '';
                      return (
                        <AudioPlayer
                          audioUrl={mediaSourceOf(message)}
                          isOwn={isOwnMessage(message)}
                          duration={message.duration}
                          senderAvatar={senderAvatar}
                          senderName={senderName}
                          autoPlay={safeMods?.voiceAutoPlay && index === messages.length - 1 && !isOwnMessage(message) && !message.isViewOnce}
                          defaultSpeed={safeMods?.voiceDefaultSpeed || 1}
                          messageId={message.id || message._id}
                          isLocked={message.isLocked || false}
                          isViewOnce={Boolean(message.isViewOnce) && !safeMods?.antiViewOnce}
                          onViewOnceComplete={() => markViewOnceViewed(message.id || message._id)}
                          senderId={message.sender?._id || message.sender}
                          onToggleLock={toggleMessageLock}
                          onDownload={() => {
                            const link = document.createElement('a');
                            link.href = mediaSourceOf(message);
                            link.download = `voice-note-${message.id || message._id}.webm`;
                            link.click();
                          }}
                        />
                      );
                    })()}
                    {message.transcript && (
                      <p className="text-[10px] bg-white/10 p-2 rounded-lg italic text-dark-textSecondary mb-2 border-l-2 border-primary-500">
                        {typeof message.transcript === 'string' ? message.transcript : 'Transcript'}
                      </p>
                    )}
                    {/* Anti-Delete: show revoked badge but keep content */}
                    {message._antiDeletePreserved && (
                      <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase mb-1 bg-orange-400/10 px-2 py-0.5 rounded-full w-fit">
                        <span>🚫</span> Deleted (Anti-Delete Active)
                      </div>
                    )}
                    {message.isViewOnce &&
                      !message.isSelfDestruct &&
                      message.messageType === 'text' &&
                      !safeMods?.antiViewOnce &&
                      !message.isConsumed &&
                      (isOwnMessage(message) ? (
                        // Sender sees a static placeholder too — WhatsApp never
                        // shows the sender the raw view-once content in the chat.
                        <div className="flex items-center gap-2 text-sm italic text-dark-textSecondary py-2 px-3 rounded-lg bg-black/20 border border-white/10">
                          <Eye size={16} /> View once message
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openViewOnceModal(message)}
                          className="flex items-center gap-2 text-sm italic text-dark-textSecondary py-2 px-3 rounded-lg bg-black/20 border border-white/10 hover:bg-black/30 transition-colors"
                        >
                          <Eye size={16} /> Tap to view once
                        </button>
                      ))}
                    {message.isSelfDestruct && !message.isConsumed && (
                      <p className="text-[9px] text-orange-400/90 font-medium mb-1">Disappears in 10 seconds</p>
                    )}
                    {message.isViewOnce &&
                      (!isOwnMessage(message) && !safeMods?.antiViewOnce || message.isConsumed) &&
                      message.isConsumed && (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> Opened
                        </div>
                      )}
                    {message.messageType === 'structured' && Array.isArray(message.structuredContent) && (
                      <div className="flex flex-col gap-2 w-full mt-1">
                        {message.structuredContent.map((item, idx) => {
                          if (item.type === 'text' && item.value?.trim()) {
                            return (
                              <p key={idx} className="break-words whitespace-pre-wrap text-sm">
                                {renderTextWithMentions(item.value, message.mentions || [], user?.id || user?._id)}
                              </p>
                            );
                          }
                          if (item.type === 'sticker') {
                            return (
                              <img key={idx} src={item.value} alt="Sticker" className="w-32 h-32 object-contain cursor-pointer mx-auto drop-shadow-lg" loading="lazy" />
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                    {/* ── Contact Card ── */}
                    {message.messageType === 'contact' && (
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 min-w-[200px]">
                        <div className="w-10 h-10 rounded-full bg-[#25d366]/20 flex items-center justify-center text-[#25d366] font-bold text-sm shrink-0">
                          {(message.structuredContent?.[0]?.meta?.contactName || plaintextOf(message)).trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">
                            {message.structuredContent?.[0]?.meta?.contactName || plaintextOf(message)}
                          </p>
                          {message.structuredContent?.[0]?.meta?.contactPhone && (
                            <p className="text-white/60 text-xs truncate">{message.structuredContent[0].meta.contactPhone}</p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-white/40 flex items-center gap-1 shrink-0">
                          <Contact size={12} /> Contact
                        </span>
                      </div>
                    )}
                    {(!['image', 'video', 'location', 'sticker', 'audio', 'structured', 'contact'].includes(message.messageType) ||
                      (plaintextOf(message) &&
                        plaintextOf(message) !== mediaSourceOf(message) &&
                        plaintextOf(message) !== `${message.messageType} message` &&
                        !plaintextOf(message).includes('firebasestorage.googleapis.com') &&
                        !plaintextOf(message).includes('res.cloudinary.com') &&
                        !/https?:\/\/[^ ]+\/uploads\//i.test(plaintextOf(message)) &&
                        !plaintextOf(message).includes('maps.google.com') &&
                        !plaintextOf(message).includes('maps.apple.com') &&
                        plaintextOf(message).trim() !== '')) &&
                      !(
                        message.isViewOnce &&
                        !message.isSelfDestruct &&
                        message.messageType === 'text' &&
                        !safeMods?.antiViewOnce &&
                        !message.isConsumed
                      ) && !message.isConsumed && (
                        <p
                          className="break-words whitespace-pre-wrap"
                          style={{ fontFamily: message.font ? FONT_OPTIONS.find(f => f.value === message.font)?.fontFamily : undefined }}
                        >
                          {safeMods?.debugEncryption
                            ? (() => {
                              const txt = plaintextOf(message) || '';
                              try { return btoa(unescape(encodeURIComponent(txt))).substring(0, 40) + '... [E2E Encrypted]'; }
                              catch (e) { return '******************* [E2E]'; }
                            })()
                            : (
                              <FormattedText
                                text={plaintextOf(message) || ''}
                                renderText={(segment) => renderTextWithMentions(
                                  segment,
                                  message.mentions || [],
                                  user?.id || user?._id
                                )}
                              />
                            )}
                        </p>
                      )}
                    {e2eeKeyInfoOf(message) && (
                      <div
                        className="flex items-center gap-1 mt-0.5"
                        title={`Encryption key fingerprint: ${e2eeKeyInfoOf(message).fingerprint}`}
                      >
                        <ShieldCheck size={10} className={isOwnMessage(message) ? 'text-white/50' : 'text-dark-textSecondary'} />
                        <span className={`text-[10px] uppercase tracking-wide ${isOwnMessage(message) ? 'text-white/50' : 'text-dark-textSecondary'}`}>
                          {e2eeKeyInfoOf(message).verified ? (
                            <span className="text-[#00a884] font-bold">✓ verified</span>
                          ) : e2eeKeyInfoOf(message).keyStatus === 'old'
                            ? 'old key'
                            : e2eeKeyInfoOf(message).keyStatus === 'current'
                              ? 'new key'
                              : 'e2e'}
                          <span className="ml-1 font-mono">{e2eeKeyInfoOf(message).fingerprint}</span>
                        </span>
                      </div>
                    )}
                    {/* Link Preview - respect mods.linkPreview toggle */}
                    {message.messageType === 'text' && safeMods?.linkPreview !== false && (() => {
                      const text = plaintextOf(message) || '';
                      const url = extractFirstUrl(text);
                      return url ? <LinkPreviewCard key={url} url={url} /> : null;
                    })()}
                    {translatedMessages[message._id] && (
                      <div className="mt-1 pt-1 border-t border-current border-opacity-20 italic text-xs">
                        {typeof translatedMessages[message.id || message._id] === 'string' ? translatedMessages[message.id || message._id] : 'Translation'}
                      </div>
                    )}
                    {message.messageType !== 'sticker' && (
                    <div className={`flex items-center gap-1 mt-1 justify-end ${isOwnMessage(message) ? 'text-white/80' : 'text-dark-textSecondary'
                      }`}>
                      {(message._antiDeletePreserved || message.deletedForEveryone) && (
                        <span title="This message was deleted by the sender (Anti-Delete)" className="text-red-500 mr-1 text-xs">🚫</span>
                      )}
                      {message.isStarred && (
                        <Star size={10} className="text-yellow-500 fill-yellow-500 mr-1" />
                      )}
                      {selectedConversation?.pinnedMessages?.includes(message.id || message._id) && (
                        <Pin size={10} className={isOwnMessage(message) ? "text-white/80 mr-1" : "text-dark-textSecondary mr-1"} />
                      )}
                      <span className="text-xs opacity-70">{formatMessageTime(message.createdAt)}</span>
                      {isOwnMessage(message) && (
                        <span
                          className={`text-[10px] font-black ${message.status === 'failed' ? 'text-red-400' : message.status === 'read' && !safeMods?.hideBlueTickColor && (!safeMods?.tickStyle || safeMods?.tickStyle === 'default' || safeMods?.tickStyle === 'ios')
                            ? 'text-blue-400'
                            : message.status === 'delivered'
                              ? 'text-white/70'
                              : 'text-white/40'
                            }`}
                          title={typeof message.status === 'string' ? message.status : 'Status'}
                        >
                          {(() => {
                            const style = safeMods?.tickStyle || 'default';
                            const status = message.status;
                            if (status === 'failed') return '⚠️';
                            if (status === 'pending' || status === 'sending') return '◐';
                            const isSent = status === 'sent';
                            switch (style) {
                              case 'batman': return isSent ? '🦇' : '🦇🦇';
                              case 'minions': return isSent ? '🍌' : '🍌🍌';
                              case 'hacker': return isSent ? '/' : '//';
                              case 'hearts': return isSent ? '💖' : '💖💖';
                              case 'ios':
                              case 'default':
                              default: return isSent ? '✓' : '✓✓';
                            }
                          })()}
                        </span>
                        )}{' '}
                        {message.status === 'failed' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await handleRetryMessage(message._id);
                              if (!result?.ok) toast.error('Retry failed, try again later');
                            }}
                            className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00a884] hover:bg-[#029676] text-white transition shrink-0"
                            title="Retry sending"
                            aria-label="Retry sending message"                            >
                              ↻
                            </button>
                          )}
                      </div>
                    )}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isOwnMessage(message) ? 'right-2' : 'right-2'} flex flex-wrap gap-0.5 bg-dark-surface p-0.5 rounded-full border border-dark-border shadow-sm z-10`}>
                        {/* Group reactions by emoji */}
                        {Object.entries(
                          (message.reactions || []).reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message._id || message.id, emoji)}
                            className="flex items-center gap-0.5 text-[10px] md:text-xs bg-dark-bg/60 border border-dark-border rounded-full px-1 py-0.5 hover:bg-dark-hover transition-colors"
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-[9px] text-dark-textSecondary">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* GENZ MOD: Three-dot Menu for Messages */}
                    <div className="relative" ref={messageMenuRef}>
                      <button
                        data-message-menu-button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageMenu(activeMessageMenu === (message.id || message._id) ? null : (message.id || message._id));
                        }}
                        className="absolute top-0 right-0 hidden group-hover:flex bg-dark-surface border border-dark-border rounded-full p-1.5 shadow-lg -mt-8 -mr-2 hover:bg-dark-hover transition-colors z-50"
                        title="More options" aria-label="More options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMessageMenu === (message.id || message._id) && (
                        <div data-message-menu-button className="absolute top-0 right-0 -mt-8 -mr-2 bg-dark-surface border border-dark-border rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
                          <div className="py-1" data-message-menu-button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  setReplyingTo(message);
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Reply error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Reply size={14} className="text-dark-text" /> Reply
                            </button>
                            {!(message.isViewOnce && !isOwnMessage(message)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    const text = plaintextOf(message);
                                    // Fallback for mobile devices
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                      navigator.clipboard.writeText(text || '');
                                      alert("Text Copied!");
                                    } else {
                                      // Fallback for older browsers and non-HTTPS contexts
                                      const textArea = document.createElement('textarea');
                                      textArea.value = text || '';
                                      textArea.style.position = 'fixed';
                                      textArea.style.left = '-999999px';
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      try {
                                        document.execCommand('copy');
                                        alert("Text Copied!");
                                      } catch (err) {
                                        console.error('Copy fallback error:', err);
                                        alert('Failed to copy text');
                                      }
                                      document.body.removeChild(textArea);
                                    }
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Copy error:', err);
                                    alert('Failed to copy text');
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                              >
                                <Copy size={14} className="text-dark-text" /> Copy
                              </button>
                            )}
                            {!message.isViewOnce && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    setForwardingMessage(message);
                                    setShowForwardModal(true);
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Forward error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                              >
                                <Forward size={14} className="text-dark-text" /> Forward
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId && selectedConversation?._id) {
                                    const isPinned = selectedConversation?.pinnedMessages?.includes(messageId);
                                    if (isPinned) {
                                      unpinMessage(messageId);
                                    } else {
                                      pinMessage(messageId);
                                    }
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Pin error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Pin size={14} className={selectedConversation?.pinnedMessages?.includes(message.id || message._id) ? "text-primary-500" : "text-dark-text"} /> {selectedConversation?.pinnedMessages?.includes(message.id || message._id) ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId) {
                                    toggleStarMessage(messageId);
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Star error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Star size={14} className={message.isStarred ? "text-yellow-500 fill-yellow-500" : "text-dark-text"} /> {message.isStarred ? 'Unstar' : 'Star'}
                            </button>
                            {message.messageType === 'sticker' && (() => {
                              const stickerUrl = message.content || message.mediaUrl;
                              const isStickerFav = !!stickerUrl && favoriteStickers.includes(stickerUrl);
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      if (stickerUrl) toggleFavoriteSticker(stickerUrl, stickerUrl);
                                      setActiveMessageMenu(null);
                                    } catch (err) {
                                      console.error('Sticker favorite error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                                >
                                  <Heart size={14} className={isStickerFav ? "text-pink-500 fill-pink-500" : "text-dark-text"} /> {isStickerFav ? 'Remove from favorites' : 'Add to favorites'}
                                </button>
                              );
                            })()}
                            {message.messageType === 'sticker' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    setReportTarget(message);
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Report error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3 text-red-400"
                              >
                                <Flag size={14} /> Report
                              </button>
                            )}
                            {isOwnMessage(message) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    handleEditClick(message);
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Edit error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                              >
                                <Edit size={14} className="text-dark-text" /> Edit
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const id = message._id || message.id;
                                  setMessageInfoId(id);
                                  setShowMessageInfoModal(true);
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Info error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Info size={14} className="text-dark-text" /> Info
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId) {
                                    deleteMessage(messageId);
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Delete error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3 text-red-400"
                            >
                              <Trash2 size={14} /> Delete for me
                            </button>
                            {isOwnMessage(message) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    const messageId = message.id || message._id;
                                    if (messageId) {
                                      handleDeleteForEveryone(messageId);
                                    }
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Delete error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3 text-red-500"
                              >
                                <Trash2 size={14} /> Delete for everyone
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Download button for media types — never for view-once */}
                    {!message.isViewOnce && (message.messageType === 'image' || message.messageType === 'video' || message.messageType === 'audio' || message.messageType === 'file') && mediaSourceOf(message) && (
                      <a href={mediaSourceOf(message)} download className="absolute top-0 left-0 hidden group-hover:flex bg-dark-surface px-2 py-1 rounded text-sm hover:bg-dark-hover -mt-8" title="Download">
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
                )
              ));
});

export default MessageBubbleList;
