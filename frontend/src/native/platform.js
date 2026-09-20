import { Capacitor } from '@capacitor/core';

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const isNative = () => Capacitor.isNativePlatform();
