import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../navigation/MainStackNavigator';

type ExploreWebViewRoute = RouteProp<MainStackParamList, 'ExploreWebView'>;

export default function ExploreWebViewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ExploreWebViewRoute>();
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{route.params.title || 'Video'}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.webViewWrap}>
        <WebView
          source={{ uri: route.params.url }}
          style={styles.webView}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          onLoadEnd={() => setLoading(false)}
        />
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: Colors.light.onSurface,
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  webViewWrap: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
});
