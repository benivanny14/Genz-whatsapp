/**
 * haptics.js — Haptic feedback for Capacitor APK.
 *
 * Silently no-ops on web or when haptics are unavailable.
 */
import { Capacitor } from '@capacitor/core';

/**
 * Trigger haptic feedback.
 * @param {'light'|'medium'|'heavy'|'success'|'warning'|'error'} [type='light']
 */
export const haptic = async (type = 'light') => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {
    // Silently fail — haptics are not critical
  }
};

/**
 * Button wrapper that triggers haptic on press.
 * @param {Object} props
 * @param {'light'|'medium'|'heavy'} [props.hapticType='light']
 */
export const HapticButton = ({ children, hapticType = 'light', onClick, ...props }) => {
  const handleClick = async (e) => {
    await haptic(hapticType);
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
