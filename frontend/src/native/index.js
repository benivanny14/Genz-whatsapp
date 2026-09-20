import { applyNativeChrome } from './chrome';
import { initBackButton, configureBackButton } from './backButton';
import { initUpdateChecker } from './updateChecker';
import { initDeepLinks } from './deepLinks';
import { isNative } from './platform';

export async function bootstrapNativeShell({ toast, navigate, selectConversation, getChatState, showUpdate }) {
  await applyNativeChrome();
  configureBackButton({ toast, getState: getChatState });
  const stopBack = initBackButton();
  const stopLinks = initDeepLinks({ navigate, selectConversation });
  const stopUpdates = initUpdateChecker(showUpdate);
  document.documentElement.classList.add(isNative() ? 'genz-native' : 'genz-web');
  return () => {
    stopBack?.();
    stopLinks?.();
    stopUpdates?.();
  };
}

export { registerNativePush } from './push';
export { pickNativeMedia } from './media';
export { setKeepAwake } from './keepAwake';
export { openApkUrl, dismissUpdatePrompt } from './updateChecker';
export { nativeShare } from './share';
export { isNative } from './platform';
