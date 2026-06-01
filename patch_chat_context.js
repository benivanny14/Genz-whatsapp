const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, 'frontend/src/context/ChatContext.jsx');
let content = fs.readFileSync(contextPath, 'utf8');

// Find the mangled addReaction part
const mangledRegex = /const addReaction = \(messageId, emoji\) => \{[\s\S]*?const id = p\?\._id \|\| p;[\s\S]*?return id\?\.toString\(\) !== me\?\.toString\(\);[\s\S]*?\}\);[\s\S]*?return other\?\._id \|\| other \|\| null;[\s\S]*?\}, \[currentUserId\]\);[\s\S]*?const initiateCall = \(type, conversationOrUser\) => \{/m;

const replacement = `const addReaction = (messageId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m._id === messageId) {
        const reactions = m.reactions || [];
        return { ...m, reactions: [...reactions, { emoji, user: currentUserId }] };
      }
      return m;
    }));
    emitSafe('reaction:add', { messageId, emoji });
  };

  const markAsRead = (chatId) => {
    if (!modsRef.current.hideReadReceipts) {
      emitSafe('mark_as_read', { chatId, userId: currentUserId });
    }
  };

  // ── Typing (Ghost Mode aware) ──
  const sendTypingStatus = (isTyping) => {
    if (!modsRef.current.ghostMode) {
      emitSafe('message:typing', { conversationId: selectedConversation?._id, isTyping });
    }
  };
  const sendRecordingStatus = (isRecording) => {
    if (!modsRef.current.ghostMode) {
      emitSafe('recording', { conversationId: selectedConversation?._id });
    }
    setIsOtherUserRecording(isRecording);
  };

  // ── Calls (Phase 8) ──
  const getOtherParticipantId = useCallback((conversation) => {
    if (!conversation?.participants?.length) return null;
    const me = currentUserId;
    const other = conversation.participants.find((p) => {
      const id = p?._id || p;
      return id?.toString() !== me?.toString();
    });
    return other?._id || other || null;
  }, [currentUserId]);

  const initiateCall = (type, conversationOrUser) => {`;

if (mangledRegex.test(content)) {
  content = content.replace(mangledRegex, replacement);
  fs.writeFileSync(contextPath, content);
  console.log('Fixed addReaction and getOtherParticipantId in ChatContext.jsx');
} else {
  console.log('Mangled section not found. Checking if initiateCall needs fixing instead.');
  
  // Also fix initiateCall if it still has the old version
  const oldInitiateCallRegex = /const initiateCall = \(type, conversationOrUser\) => \{[\s\S]*?const calleeId = getOtherParticipantId\(conversation\);[\s\S]*?const callData = \{[\s\S]*?type,[\s\S]*?user: conversationOrUser,[\s\S]*?status: 'calling',[\s\S]*?conversationId: conversation\?\._id,[\s\S]*?calleeId[\s\S]*?\};[\s\S]*?setActiveCall\(callData\);/m;
  
  const initiateCallReplacement = `const initiateCall = (type, conversationOrUser) => {
    const conversation = conversationOrUser?.participants
      ? conversationOrUser
      : selectedConversation;
    const calleeId = getOtherParticipantId(conversation);
    // Get the other participant's info for display
    const otherUser = conversation?.participants?.find(p => {
      const id = p?._id || p;
      return id?.toString() !== currentUserId?.toString();
    });
    const callData = {
      type,
      user: otherUser || conversationOrUser,
      callerName: otherUser?.username || 'Unknown',
      status: 'calling',
      conversationId: conversation?._id,
      calleeId
    };
    setActiveCall(callData);`;

  if (oldInitiateCallRegex.test(content)) {
    content = content.replace(oldInitiateCallRegex, initiateCallReplacement);
    fs.writeFileSync(contextPath, content);
    console.log('Fixed initiateCall in ChatContext.jsx');
  } else {
    console.log('No matches found for fixes.');
  }
}
