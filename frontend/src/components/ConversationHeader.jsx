import React from 'react';
import { ArrowLeft, Download, Ghost, ImageIcon, Lock, MoreVertical, Radio, Search, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import { formatMessageTime } from '../utils/formatDate';

/**
 * ConversationHeader — the chat header (avatar, name, presence, menu) for ChatArea.
 *
 * Extracted verbatim from ChatArea.jsx (lines 2494-2758). Receives a single
 * ctx bundle so the JSX content is untouched; behavior is identical.
 */
const ConversationHeader = React.memo(function ConversationHeader({ ctx }) {
  const {
    safeMods, selectConversation, sidebarOpen, onOpenSidebar,
    isSearching, setIsSearching, chatSearchQuery, setChatSearchQuery,
    selectedConversation, setShowGroupInfo, setShowContactInfo,
    isLiveLocationActive, getConversationAvatar, getConversationName,
    peerPresence, isOtherUserTyping, groupOnlineCount, history,
    typingByConversation, isOtherUserRecording, setShowSearchMessages,
    setShowMediaGallery, headerMenuRef, setShowHeaderMenu, showHeaderMenu,
    toggleDNDMode, isDNDMode, handleClearCurrentChat, handleDeleteCurrentChat,
    handleExportChat, viewProfile, otherUser
  } = ctx;

  return (
    <>
  <header
          style={{ backgroundColor: safeMods.customTheme }}
          className="border-b border-white/10 px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-4 shadow-lg transition-all duration-500 z-[100] flex-shrink-0 min-w-0 sticky top-0"
        >
          {/* Mobile back arrow to close chat and show list */}
          <button onClick={() => selectConversation(null)} className="md:hidden p-2 hover:bg-dark-hover rounded-lg flex items-center justify-center flex-shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
  
          {/* Desktop sidebar toggle button */}
          {!sidebarOpen && (
            <button onClick={onOpenSidebar} className="hidden md:block p-2 hover:bg-dark-hover rounded-lg" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            {isSearching ? (
              <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full flex-1">
                <Search size={14} className="text-white/60" />
                <input
                  autoFocus
                  className="bg-transparent border-none focus:ring-0 text-base md:text-xs text-white w-full"
                  placeholder="Search messages..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                />
                <button onClick={() => { setIsSearching(false); setChatSearchQuery(''); }} aria-label="Close"><X size={14} className="text-white" /></button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors"
                onClick={() => {
                  if (selectedConversation?.isGroup) {
                    setShowGroupInfo(true);
                  } else {
                    setShowContactInfo(true);
                    // Record a profile visit (only stored if the target user
                    // enabled trackProfileVisitors — see socket visit_profile).
                    const visitedUserId = otherUser?._id || otherUser?.id || selectedConversation?._id;
                    if (visitedUserId && viewProfile) {
                      viewProfile(visitedUserId);
                    }
                  }
                }}
              >
                {isLiveLocationActive && (
                  <span className="text-red-500 text-xs font-bold animate-pulse flex items-center gap-1 mr-2"><Radio size={14} /> LIVE</span>
                )}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
                    {getConversationAvatar() ? (
                      <img src={getConversationAvatar()} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold">
                        {getConversationName().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* GENZ MOD: Online Indicator */}
                  {!selectedConversation.isGroup && peerPresence?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-[2.5px] border-[#202c33] rounded-full z-10 shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-medium truncate leading-tight flex items-center gap-1.5">
                    {getConversationName()}
                    {selectedConversation?.isGroup ? (
                      <ShieldAlert size={13} className="text-amber-400/90 flex-shrink-0" title="Messages za group hazijafichwa end-to-end — server inaziona" aria-label="Group messages not E2E encrypted" />
                    ) : safeMods?.clientE2EE ? (
                      <Lock size={12} className="text-[#00a884] flex-shrink-0" title="Text messages in this chat are encrypted end-to-end on your device" aria-label="Chat encrypted end-to-end" />
                    ) : (
                      <Lock size={12} className="text-white/40 flex-shrink-0" title="Messages encrypted in transit & at rest" aria-label="Messages encrypted in transit and at rest" />
                    )}
                  </h2>
                  {selectedConversation.isGroup && !isOtherUserTyping && (
                    <p className="text-[10px] text-white/60 truncate">
                      {groupOnlineCount} online · {(selectedConversation.participants || []).length} members
                    </p>
                  )}
                  {!selectedConversation.isGroup && peerPresence && !isOtherUserTyping && (
                    <p className="text-[10px] text-white/60 truncate">
                      {peerPresence.isOnline
                        ? 'online'
                        : peerPresence.lastSeen
                          ? `last seen ${formatMessageTime(peerPresence.lastSeen)}`
                          : 'offline'}
                    </p>
                  )}
                  {!selectedConversation.isGroup && !peerPresence && history.length > 0 && !isOtherUserTyping && (
                    <p className="text-[10px] text-white/60 truncate">
                      Last 24h activity: {history.slice(-3).map(h => formatMessageTime(h.time)).join(', ')}
                    </p>
                  )}
                  {isOtherUserTyping && (
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] text-[#00a884] font-medium">
                        {selectedConversation?.isGroup
                          ? `${typingByConversation[selectedConversation._id]?.username || 'Someone'} is typing`
                          : 'typing'}
                      </p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1 h-1 bg-[#00a884] rounded-full inline-block"
                            style={{animation:'typingBounce 1.2s infinite ease-in-out', animationDelay:`${i*0.2}s`}} />
                        ))}
                      </div>
                    </div>
                  )}
                  {isOtherUserRecording && (
                    <p className="text-sm text-white/70 animate-pulse">recording audio...</p>
                  )}
                  {safeMods.ghostMode && (
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <Ghost size={10} /> Ghost Mode Active
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Header right-side action buttons */}
          {!isSearching && (
            <div className="flex items-center gap-0.5 md:gap-1 ml-auto relative flex-shrink-0">
              {/* Search in chat */}
              <button onClick={() => setShowSearchMessages(true)} title="Search messages" aria-label="Search messages"
                className="hidden sm:flex p-2 hover:bg-white/10 rounded-lg transition-colors items-center justify-center">
                <Search size={18} className="text-white/80" />
              </button>
              <button onClick={() => setShowMediaGallery(true)} title="Media gallery" aria-label="Media gallery"
                className="hidden sm:flex p-2 hover:bg-white/10 rounded-lg transition-colors items-center justify-center">
                <ImageIcon size={18} className="text-white/80" />
              </button>
  
              {/* Actions Dropdown Toggle (Three Dots) */}
              <div className="relative" ref={headerMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowHeaderMenu((prev) => !prev)}
                  className="block p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="More Options" aria-label="More Options"
                >
                  <MoreVertical size={18} className="text-white/80" />
                </button>
  
                {showHeaderMenu && (
                  <>
                    <div className="fixed inset-0 bg-black/20 z-[80]" onClick={() => setShowHeaderMenu(false)} />
                    <div className="fixed top-0 right-0 h-full w-[85vw] max-w-[320px] bg-dark-surface/95 backdrop-blur-md border-l border-dark-border shadow-2xl z-[90] overflow-y-auto">
                    <div className="p-3 border-b border-dark-border flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white">Menu</h2>
                      <button
                        onClick={() => setShowHeaderMenu(false)}
                        className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors"
                       aria-label="Close">
                        <X size={16} className="text-white/80" />
                      </button>
                    </div>
                    <div className="py-2">
                    {/* Mobile DND toggle */}
                    <button
                      onClick={() => {
                        toggleDNDMode();
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <span className="text-sm font-bold w-4 text-center text-orange-500">
                        {isDNDMode ? '🌙' : '🔔'}
                      </span>
                      <span>{isDNDMode ? 'Disable DND' : 'Do Not Disturb'}</span>
                    </button>
  
                    {/* Search messages */}
                    <button
                      onClick={() => {
                        setShowSearchMessages(true);
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <Search size={16} className="text-white/60" />
                      <span>Search Messages</span>
                    </button>
  
                    <button
                      onClick={() => {
                        setShowMediaGallery(true);
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <ImageIcon size={16} className="text-white/60" />
                      <span>Media Gallery</span>
                    </button>
  
                    <button
                      onClick={handleClearCurrentChat}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white border-t border-white/5 mt-1 pt-3"
                    >
                      <Trash2 size={16} className="text-white/60" />
                      <span>Clear Chat</span>
                    </button>
  
                    <button
                      onClick={handleDeleteCurrentChat}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-red-400"
                    >
                      <Trash2 size={16} />
                      <span>Delete Chat</span>
                    </button>
  
                    {/* Export chat */}
                    <button
                      onClick={() => {
                        handleExportChat('txt');
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <Download size={16} className="text-white/60" />
                      <span>Export Chat (.txt)</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportChat('whatsapp');
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <Download size={16} className="text-white/60" />
                      <span>Export Chat (WhatsApp .txt)</span>
                    </button>
  
                    {/* Edit Wallpaper */}
                    <button
                      onClick={() => {
                        setShowHeaderMenu(false);
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) handleUploadWallpaper(file);
                        };
                        input.click();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                    >
                      <ImageIcon size={16} className="text-white/60" />
                      <span>Edit Wallpaper</span>
                    </button>
  
                    {/* Mobile Group Info */}
                    {selectedConversation?.isGroup && (
                      <button
                        onClick={() => {
                          setShowGroupInfo(true);
                          setShowHeaderMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white border-t border-white/5"
                      >
                        <Users size={16} className="text-white/60" />
                        <span>Group Info</span>
                      </button>
                    )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}
        </header>
    </>
  );
});

export default ConversationHeader;
