import Constants from 'expo-constants';

/**
 * Detect if app is running in Expo Go (development) or standalone build
 */
export const isExpoGo = () => {
  if (!Constants?.executionEnvironment) {
    return true; // Default to Expo Go if we can't detect
  }

  // Expo Go runs with 'expo-go' or 'development' in executionEnvironment
  const env = Constants.executionEnvironment.toLowerCase();
  return env.includes('expo-go') || env.includes('development');
};

/**
 * Detect if app is running in production build
 */
export const isProduction = () => {
  return !isExpoGo();
};

/**
 * Check if native modules are available (only in standalone builds)
 */
export const areNativeModulesAvailable = () => {
  return isProduction();
};
