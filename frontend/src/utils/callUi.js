// FIX: IncomingCallPopup used to be the only UI shown while status === 'incoming',
// and its "Accept" button called ChatContext's bare acceptCall() which just flips
// status to 'connected' without ever answering the WebRTC offer. That made
// CallScreen mount for the first time with status 'connected' (not 'incoming'),
// so its isIncoming check went false and it ran its *outgoing* call-setup effect
// instead — creating a brand new SDP offer back to the original caller. The
// server then treated that as a fresh call and re-sent 'call:incoming' to the
// caller, making their screen jump back to "incoming call" for someone they had
// just called (looked like "the call dials itself again a second time").
// CallScreen already has its own complete, correct incoming-call UI and a
// handleAccept() that properly answers the real offer, so it now owns the whole
// 'incoming' -> 'connected' lifecycle and IncomingCallPopup is no longer used
// for 1:1 calls.
export const shouldShowIncomingCallPopup = () => false;

export const shouldShowCallScreen = (call) => Boolean(call && ['incoming', 'calling', 'connecting', 'connected'].includes(call.status));
