import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';

let navigationBarConfigured = false;

export async function applyNativeChrome() {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b141a' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.warn('[native] status bar setup failed', error);
  }

  try {
    const { NavigationBar } = await import('@capacitor/navigation-bar');
    if (!navigationBarConfigured) {
      await NavigationBar.setColor({ color: '#0b141a', darkButtons: false });
      navigationBarConfigured = true;
    }
  } catch (error) {
    console.warn('[native] navigation bar plugin unavailable', error);
  }

  try {
    await SplashScreen.hide();
  } catch (_) {
    /* splash plugin may already have hidden */
  }
}
