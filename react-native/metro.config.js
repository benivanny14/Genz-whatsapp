const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Standard React Native 0.72 Metro config. The prototype shipped without a
 * metro.config.js, so bundling (and `react-native run-android` for a real
 * build) failed immediately. Uses the framework defaults for this version.
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {});
