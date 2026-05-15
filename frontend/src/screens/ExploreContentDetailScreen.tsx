import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { ExploreContent, exploreService } from '../services/exploreService';

type ExploreContentDetailRoute = RouteProp<MainStackParamList, 'ExploreContentDetail'>;

export default function ExploreContentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ExploreContentDetailRoute>();
  const [content, setContent] = useState<ExploreContent | null>(route.params.initialContent || null);
  const [loading, setLoading] = useState(!route.params.initialContent);
  const [refreshing, setRefreshing] = useState(false);

  const paragraphs = useMemo(() => {
    const body = content?.content || content?.summary || content?.subtitle || '';
    return body
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [content]);

  const loadContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await exploreService.getContent(route.params.slug);
      setContent(data);
    } catch (error) {
      console.error('Failed to load explore content detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.slug]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{content?.title || 'Bai viet'}</Text>
        <View style={styles.iconButton} />
      </View>

      {loading && !content ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadContent(true)} colors={[Colors.light.primary]} />}
        >
          {content?.thumbnail_url ? (
            <Image source={{ uri: content.thumbnail_url }} style={styles.heroImage} />
          ) : null}

          {content?.badge_text ? (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, content.badge_color ? { color: content.badge_color } : null]}>
                {content.badge_text}
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>{content?.title}</Text>
          {content?.subtitle ? <Text style={styles.subtitle}>{content.subtitle}</Text> : null}
          {content?.summary && content.summary !== content.subtitle ? <Text style={styles.summary}>{content.summary}</Text> : null}

          <View style={styles.articleBody}>
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <Text key={`${content?.id || route.params.slug}-${index}`} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text style={styles.emptyText}>No article content has been added yet.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    backgroundColor: '#FAF8F2',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#143D38',
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 48,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 16,
    backgroundColor: Colors.light.surfaceContainer,
    marginBottom: Spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  badgeText: {
    color: Colors.light.primary,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#143D38',
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    color: '#7350A6',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  summary: {
    color: '#5F6F6B',
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  articleBody: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(20,78,73,0.16)',
  },
  paragraph: {
    color: '#253532',
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 25,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.light.onSurfaceVariant,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
  },
});
