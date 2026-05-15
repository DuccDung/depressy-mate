import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from '../components/socials/UserAvatar';
import { BorderRadius, Spacing } from '../../constants/theme';
import { ExploreCategory, ExploreContent, exploreService } from '../services/exploreService';

const palette = {
  canvas: '#FAF8F2',
  text: '#143D38',
  body: '#687471',
  primary: '#135E58',
  accent: '#7350A6',
  card: '#FFFFFF',
  border: 'rgba(20,78,73,0.10)',
  overlay: 'rgba(8,34,31,0.42)',
  lavender: '#F1E7FF',
  mint: '#DDF6F1',
};

export default function LearningExploreScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const workshopCardWidth = Math.min(220, width * 0.55);

  const fetchExplore = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await exploreService.getExplore();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch explore content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  const workshopItems = useMemo(() => getCategoryContents(categories, ['WORKSHOP'], ['workshops-classes']), [categories]);
  const mediaItems = useMemo(() => getCategoryContents(categories, ['MEDIA'], ['healing-media']), [categories]);
  const skillItems = useMemo(() => getCategoryContents(categories, ['SKILL'], ['skill-building']), [categories]);

  const handleContentPress = async (item: ExploreContent) => {
    exploreService.trackView(item.id, user?.id).catch(() => undefined);

    if (item.youtube_url) {
      navigation.navigate('ExploreWebView', {
        title: item.title,
        url: item.youtube_url,
      });
      return;
    }

    navigation.navigate('ExploreContentDetail', {
      slug: item.slug,
      initialContent: item,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchExplore(true)} tintColor={palette.primary} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.82}>
            <Ionicons name="menu" size={22} color={palette.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explore & Learn</Text>
          <UserAvatar
            userId={user?.id || ''}
            size={40}
            prefetchData={{ avatarUrl: user?.avatarUrl, name: user?.fullName }}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={palette.primary} style={styles.loader} />
        ) : null}

        {!loading && categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Chưa có nội dung Khám phá</Text>
            <Text style={styles.emptyText}>Nội dung sẽ xuất hiện sau khi admin xuất bản bài mới.</Text>
          </View>
        ) : null}

        {workshopItems.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Workshops & Classes</Text>
              <TouchableOpacity activeOpacity={0.82}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workshopList}
            >
              {workshopItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.workshopCard, { width: workshopCardWidth }]}
                  activeOpacity={0.88}
                  onPress={() => handleContentPress(item)}
                >
                  <ImageBackground
                    source={{ uri: getThumbnail(item) }}
                    style={styles.workshopImage}
                    imageStyle={styles.workshopImageStyle}
                  >
                    <View style={styles.imageOverlay} />
                    <View style={styles.workshopCopy}>
                      {item.badge_text ? (
                        <View style={styles.tagPill}>
                          <Text style={[styles.tagText, item.badge_color ? { color: item.badge_color } : null]}>{item.badge_text}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.workshopTitle}>{item.title}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        {mediaItems.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, styles.mediaTitle]}>Healing Media</Text>
            <View style={styles.mediaList}>
              {mediaItems.map((item) => (
                <TouchableOpacity key={item.id} style={styles.mediaCard} activeOpacity={0.88} onPress={() => handleContentPress(item)}>
                  <ImageBackground
                    source={{ uri: getThumbnail(item) }}
                    style={styles.mediaImage}
                    imageStyle={styles.mediaImageStyle}
                  >
                    <View style={styles.imageOverlay} />
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.mediaCopy}>
                      <Text style={styles.mediaCardTitle}>{item.title}</Text>
                      <Text style={styles.mediaSubtitle}>{item.subtitle || item.summary}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {skillItems.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, styles.skillTitle]}>Skill Building</Text>
            <View style={styles.skillList}>
              {skillItems.map((item) => (
                <TouchableOpacity key={item.id} style={styles.skillCard} activeOpacity={0.88} onPress={() => handleContentPress(item)}>
                  <View style={[styles.skillIcon, { backgroundColor: item.icon_background_color || palette.lavender }]}>
                    <Ionicons
                      name={getIconName(item.icon_name)}
                      size={18}
                      color={item.icon_color || palette.accent}
                    />
                  </View>
                  <Text style={styles.skillCardTitle}>{item.title}</Text>
                  <Text style={styles.skillSubtitle}>{item.subtitle || item.summary || item.content}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const getCategoryContents = (categories: ExploreCategory[], types: string[], slugs: string[]) => {
  const normalizedTypes = new Set(types.map((type) => type.toUpperCase()));
  const normalizedSlugs = new Set(slugs);
  return categories
    .filter((category) => normalizedTypes.has(category.category_type.toUpperCase()) || normalizedSlugs.has(category.slug))
    .flatMap((category) => category.contents)
    .sort((first, second) => first.display_order - second.display_order);
};

const getThumbnail = (item: ExploreContent) => (
  item.thumbnail_url || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80'
);

const getIconName = (icon?: string | null): keyof typeof Ionicons.glyphMap => {
  if (icon && icon in Ionicons.glyphMap) {
    return icon as keyof typeof Ionicons.glyphMap;
  }

  return 'sparkles-outline';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
    marginLeft: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: palette.primary,
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  seeAllText: {
    color: palette.accent,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyState: {
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: palette.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  emptyTitle: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: palette.body,
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  workshopList: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    gap: Spacing.md,
  },
  workshopCard: {
    height: 300,
    borderRadius: 28,
    overflow: 'hidden',
  },
  workshopImage: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: palette.border,
  },
  workshopImageStyle: {
    borderRadius: 28,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlay,
  },
  workshopCopy: {
    padding: Spacing.md,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(241,231,255,0.84)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  tagText: {
    color: palette.accent,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '800',
  },
  workshopTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
  },
  mediaTitle: {
    color: palette.accent,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  mediaList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  mediaCard: {
    height: 132,
    borderRadius: 26,
    overflow: 'hidden',
  },
  mediaImage: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: palette.border,
  },
  mediaImageStyle: {
    borderRadius: 26,
  },
  playButton: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  mediaCopy: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  mediaCardTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
  },
  mediaSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Manrope',
    fontSize: 11,
    marginTop: 2,
  },
  skillTitle: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  skillList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  skillCard: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  skillIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  skillCardTitle: {
    color: '#111817',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  skillSubtitle: {
    color: palette.body,
    fontFamily: 'Manrope',
    fontSize: 12,
    lineHeight: 20,
  },
});
