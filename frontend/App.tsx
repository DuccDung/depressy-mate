import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PushNotificationProvider } from './src/contexts/PushNotificationContext';
import AuthStack from './src/navigation/AuthStack';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import AiChatAssistant from './src/components/ai/AiChatAssistant';
import { Colors } from './constants/theme';

// Custom theme cho navigation (sử dụng base schema "Radiant Sanctuary")
const AppGlobalTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.surfaceContainerLowest,
    text: Colors.light.onSurface,
    border: Colors.light.outlineVariant,
    primary: Colors.light.primary,
  },
};

/**
 * Component chính điều hướng giữa AuthStack và MainTabNavigator
 * dựa trên trạng thái đăng nhập
 */
function AppNavigator() {
  const { token, isLoading } = useAuth();

  // Hiển thị loading khi đang kiểm tra token đã lưu
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppGlobalTheme}>
      {token ? (
        <>
          <MainStackNavigator />
          <AiChatAssistant />
        </>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PushNotificationProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </PushNotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
