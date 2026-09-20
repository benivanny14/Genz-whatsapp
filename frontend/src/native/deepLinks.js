import { App } from '@capacitor/app';
import { isNative } from './platform';

function parseDeepLink(url = '') {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || parsed.host;
    const parts = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);

    if (parsed.protocol === 'app.genzwhatsapp:') {
      const kind = host || parts[0];
      if (kind === 'chat') {
        return { type: 'chat', conversationId: parsed.searchParams.get('conversationId') || parts[1] || parts[0] };
      }
      if (kind === 'group' || kind === 'join') {
        return {
          type: 'group',
          groupId: parsed.searchParams.get('groupId') || (kind === 'join' ? parts[0] : parts[1]) || parts[0],
          code: parsed.searchParams.get('code') || parts[2] || parts[1]
        };
      }
      if (kind === 'status') return { type: 'status' };
    }

    if (parsed.pathname.startsWith('/join/')) {
      return { type: 'group', groupId: parts[1], code: parts[2] };
    }
    const conversationId = parsed.searchParams.get('conversationId');
    if (conversationId) return { type: 'chat', conversationId };
  } catch (error) {
    console.warn('[deeplink] parse failed', error);
  }
  return null;
}

export function applyDeepLink(link, { navigate, selectConversation }) {
  if (!link) return;
  if (link.type === 'chat' && link.conversationId) {
    window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: link.conversationId } }));
    selectConversation?.({ _id: link.conversationId });
    navigate?.(`/chat?conversationId=${encodeURIComponent(link.conversationId)}`);
    return;
  }
  if (link.type === 'group') {
    if (link.groupId && link.code) {
      navigate?.(`/join/${link.groupId}/${link.code}`);
      return;
    }
    if (link.groupId) {
      window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: link.groupId } }));
      selectConversation?.({ _id: link.groupId, isGroup: true });
      navigate?.(`/chat?conversationId=${encodeURIComponent(link.groupId)}`);
    }
    return;
  }
  if (link.type === 'status') navigate?.('/status');
}

export function initDeepLinks(handlers) {
  const fromWindow = parseDeepLink(window.location.href);
  if (fromWindow) applyDeepLink(fromWindow, handlers);

  if (!isNative()) return () => {};
  let launchHandled = false;
  App.getLaunchUrl().then((result) => {
    if (launchHandled || !result?.url) return;
    launchHandled = true;
    applyDeepLink(parseDeepLink(result.url), handlers);
  }).catch(() => {});

  const handle = App.addListener('appUrlOpen', (event) => {
    applyDeepLink(parseDeepLink(event.url), handlers);
  });
  return () => handle.remove?.();
}
