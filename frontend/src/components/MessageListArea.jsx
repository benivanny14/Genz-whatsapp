import React from 'react';
import { Clock, Pin } from 'lucide-react';
import MessageBubbleList from './MessageBubbleList';

/**
 * MessageListArea — the scrollable message list for ChatArea.
 *
 * Extracted verbatim from ChatArea.jsx (lines 2531-2652). Receives a single
 * ctx bundle so the JSX content is untouched; behavior is identical.
 */
const MessageListArea = React.memo(function MessageListArea({ ctx }) {
  const {
    messagesContainerRef, handleMessagesScroll, safeMods, activeDoodle,
    loading, loadingOlder, selectedConversation, scheduledMessages,
    cancelScheduledMessage, isOtherUserTyping, isOtherUserRecording,
    messagesEndRef, bubbleCtx
  } = ctx;

  return (
    <>
  <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className={`flex-1 min-h-0 overflow-y-auto px-2 py-3 md:p-4 scrollbar-thin transition-all relative z-10 -webkit-overflow-scrolling-touch overscroll-behavior-contain ${safeMods?.fontSize === 'small' ? 'text-xs' :
            safeMods?.fontSize === 'large' ? 'text-base' :
              safeMods?.fontSize === 'xlarge' ? 'text-lg' : 'text-sm'
            }`}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', flex: '1 1 auto', minHeight: '0' }}
        >
          {activeDoodle && (
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.13 0 5.665-2.535 5.665-5.665S38.13 17.67 35 17.67s-5.665 2.535-5.665 5.665S31.87 29 35 29zM9 75c3.13 0 5.665-2.535 5.665-5.665S12.13 63.67 9 63.67 3.335 66.205 3.335 69.33 5.87 75 9 75zm51-61c3.13 0 5.665-2.535 5.665-5.665S57.13 2.67 54 2.67 48.335 5.205 48.335 8.33 50.87 14 54 14zm26 62c3.13 0 5.665-2.535 5.665-5.665S77.13 64.67 74 64.67 68.335 67.205 68.335 70.33 70.87 76 74 76z'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                mixBlendMode: 'overlay',
                zIndex: 0
              }}
            />
          )}
          <div className="relative z-10 w-full flex flex-col min-h-full">
            {loading ? (
              <div className="flex items-center justify-center flex-1 h-full my-auto">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-4 w-full">
                {loadingOlder && (
                  <div className="flex justify-center my-2">
                    <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm text-center inline-flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-[#8696a0] border-t-transparent rounded-full animate-spin" />
                      Loading older messages...
                    </span>
                  </div>
                )}
                {selectedConversation?.disappearingMessages?.enabled && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-2 text-yellow-700 dark:text-yellow-300 text-xs rounded-md shadow-sm mb-2 mx-auto max-w-md">
                    <p className="font-medium">⏰ Disappearing Messages</p>
                    <p>Messages disappear after {selectedConversation.disappearingMessages?.duration || selectedConversation.disappearingMessages}</p>
                  </div>
                )}
                {selectedConversation?.pinnedMessages?.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-2 text-blue-700 dark:text-blue-300 text-xs rounded-md shadow-sm mb-4 mx-auto max-w-md">
                    <p className="font-medium flex items-center gap-1"><Pin size={12} className="text-blue-500" /> {selectedConversation.pinnedMessages.length} Pinned Message(s)</p>
                  </div>
                )}
                <MessageBubbleList ctx={bubbleCtx} />
  
                {/* Render pending scheduled messages for this conversation */}
                {(scheduledMessages || [])
                  .filter(
                    sm =>
                      String(sm.conversationId?._id || sm.conversationId) === String(selectedConversation._id) &&
                      sm.status === 'pending'
                  )
                  .map((sm) => (
                    <div
                      key={sm._id}
                      className="flex w-full justify-end opacity-75"
                    >
                      <div
                        className={`max-w-[75%] relative group shadow-sm transition-all duration-300 px-4 py-2 bg-primary-600/60 text-white rounded-2xl rounded-tr-none ml-12 border border-dashed border-white/30`}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold uppercase mb-1">
                          <Clock size={10} className="animate-pulse" /> Scheduled Message
                        </div>
                        <p className="break-words whitespace-pre-wrap italic">
                          {sm.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 justify-end">
                          <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded text-white/80">
                            Sends at: {new Date(sm.sendAt).toLocaleString()}
                          </span>
                          <button
                            onClick={() => {
                              if (confirm('Cancel this scheduled message?')) {
                                cancelScheduledMessage(sm._id);
                              }
                            }}
                            className="text-[10px] bg-red-600/80 hover:bg-red-700 px-1.5 py-0.5 rounded text-white font-bold transition-colors"
                            title="Cancel scheduled message" aria-label="Cancel scheduled message"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
  
                {/* WhatsApp-style typing bubble at bottom of messages */}
                {isOtherUserTyping && (
                  <div className="flex justify-start mb-2">
                    <div className="bg-dark-surface rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-[80px]">
                      <div className="flex items-center gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-2 h-2 rounded-full bg-dark-textSecondary inline-block"
                            style={{animation:'typingBounce 1.2s infinite ease-in-out', animationDelay:`${i*0.2}s`}} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {isOtherUserRecording && (
                  <div className="flex justify-start mb-2">
                    <div className="bg-dark-surface rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[#00a884]">
                        <span className="text-xs font-medium">🎤 recording...</span>
                        <div className="flex gap-0.5 items-end">
                          {[0,1,2,3].map((b,i) => (
                            <span key={i} className="w-0.5 rounded-sm bg-[#00a884]"
                              style={{height:`${5+(i%3)*3}px`, animation:'recordWave 1s infinite ease-in-out', animationDelay:`${i*0.1}s`}}/>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} /> {/* Fixed messagesEndRef */}
              </div>
            )}
          </div>
        </div>
    </>
  );
});

export default MessageListArea;
