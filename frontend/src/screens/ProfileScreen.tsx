import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { Post, socialService } from '../services/socialService';
import { profileService, ProfileDetails } from '../services/profileService';
import { DailyHealthPoint, healthService, HealthSummary } from '../services/healthService';
import { PostCard } from '../components/socials/PostCard';
import { CommentModal } from '../components/socials/CommentModal';

type ProfileTab = 'overview' | 'posts' | 'saved';
type HealthRangeKey = 'week' | 'month' | 'year';
type HealthChartPoint = { date: string; label: string; value: number | null };
type ProfileHealthChart = {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  maxValue: number;
  data: HealthChartPoint[];
  reverseGood?: boolean;
  valueSuffix?: string;
  allowZero?: boolean;
};

const healthRangeOptions: { key: HealthRangeKey; label: string; days: number }[] = [
  { key: 'week', label: 'Tuần', days: 7 },
  { key: 'month', label: 'Tháng', days: 30 },
  { key: 'year', label: 'Năm', days: 365 },
];

const getAvatarUri = (avatarUrl?: string | null, name?: string | null) => {
  if (avatarUrl && avatarUrl.trim()) return avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1D6B63&color=fff`;
};

const formatJoinedDate = (value?: string) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const getProviderLabel = (provider?: string | null) => {
  const normalized = (provider || 'local').toLowerCase();
  if (normalized.includes('google')) return 'Google';
  if (normalized.includes('facebook')) return 'Facebook';
  return 'Email và mật khẩu';
};

const isFacebookProvider = (provider?: string | null) => (provider || '').toLowerCase().includes('facebook');

const isFacebookPlaceholderEmail = (email?: string | null) => !!email && email.toLowerCase().endsWith('@facebook.local');

const getApiErrorMessage = (error: any, fallback: string) => (
  error?.response?.data?.error || error?.message || fallback
);

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [healthRange, setHealthRange] = useState<HealthRangeKey>('week');
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [verifyEmailVisible, setVerifyEmailVisible] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const displayProfile = profile || user;
  const facebookAccount = isFacebookProvider(displayProfile?.authProvider);
  const hideEmail = facebookAccount || isFacebookPlaceholderEmail(displayProfile?.email);
  const myPostCount = posts.length;
  const savedCount = savedPosts.length;
  const selectedHealthRange = healthRangeOptions.find((item) => item.key === healthRange) || healthRangeOptions[0];
  const healthCharts = buildProfileHealthCharts(healthSummary?.daily || [], healthRange);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await profileService.getMe();
      setProfile(data);
      await updateUser({
        email: data.email,
        role: data.role,
        fullName: data.fullName,
        age: data.age,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        authProvider: data.authProvider,
        isEmailVerified: data.isEmailVerified,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [updateUser]);

  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    setLoadingPosts(true);
    try {
      const [mine, saved] = await Promise.all([
        socialService.getUserPosts(user.id, 20),
        socialService.getSavedPosts(20),
      ]);
      setPosts(mine.data);
      setSavedPosts(saved.data);
    } catch (error) {
      console.error('Failed to load profile posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [user?.id]);

  const loadHealthSummary = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const data = await healthService.getSummary(selectedHealthRange.days);
      setHealthSummary(data);
    } catch (error) {
      console.error('Failed to load profile health summary:', error);
    } finally {
      setLoadingHealth(false);
    }
  }, [selectedHealthRange.days]);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [loadProfile, loadPosts]);

  useEffect(() => {
    loadHealthSummary();
  }, [loadHealthSummary]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadPosts(), loadHealthSummary()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const updatePostInLists = (postId: string, updater: (post: Post) => Post | null) => {
    const update = (items: Post[]) => items.map((item) => (item.id === postId ? updater(item) : item)).filter(Boolean) as Post[];
    setPosts(update);
    setSavedPosts(update);
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await socialService.toggleLike(postId);
      updatePostInLists(postId, (post) => ({ ...post, is_liked: result.is_liked, like_count: result.like_count }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleSave = async (postId: string) => {
    try {
      const result = await socialService.toggleSave(postId);
      updatePostInLists(postId, (post) => {
        if (activeTab === 'saved' && !result.is_saved) return null;
        return { ...post, is_saved: result.is_saved };
      });
      if (!result.is_saved) {
        setSavedPosts((previous) => previous.filter((post) => post.id !== postId));
      }
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleCommentAdded = () => {
    if (!commentPostId) return;
    updatePostInLists(commentPostId, (post) => ({ ...post, comment_count: post.comment_count + 1 }));
  };

  const visiblePosts = activeTab === 'saved' ? savedPosts : posts;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.accountTitle}>Tài khoản</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#A33A3A" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profilePanel}>
          <Image
            source={{ uri: getAvatarUri(displayProfile?.avatarUrl, displayProfile?.fullName) }}
            style={styles.avatar}
          />
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>{displayProfile?.fullName || 'Người dùng'}</Text>
            {!hideEmail && <Text style={styles.email} numberOfLines={1}>{displayProfile?.email || ''}</Text>}
            {facebookAccount && (
              <Text style={styles.emailStatus} numberOfLines={1}>
                {displayProfile?.isEmailVerified ? 'Email đã xác thực' : 'Chưa xác thực email'}
              </Text>
            )}
            <View style={styles.providerBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#1D6B63" />
              <Text style={styles.providerText}>Đăng nhập bằng {getProviderLabel(displayProfile?.authProvider)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditVisible(true)}>
            <Ionicons name="create-outline" size={19} color="#FFF" />
          </TouchableOpacity>
        </View>

        {!!displayProfile?.bio && <Text style={styles.bio}>{displayProfile.bio}</Text>}

        <View style={styles.statsRow}>
          <StatItem label="Bài viết" value={String(myPostCount)} />
          <StatItem label="Đã lưu" value={String(savedCount)} />
          <StatItem label="Tham gia" value={formatJoinedDate(displayProfile?.createdAt)} />
        </View>

        <View style={styles.tabs}>
          <TabButton label="Tổng quan" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} />
          <TabButton label="Bài viết" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} />
          <TabButton label="Đã lưu" active={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
        </View>

        {activeTab === 'overview' ? (
          <>
            <View style={styles.infoPanel}>
              {!hideEmail && <InfoRow icon="mail-outline" label="Email" value={displayProfile?.email || 'Chưa có'} />}
              <InfoRow icon="person-circle-outline" label="Vai trò" value={displayProfile?.role || 'USER'} />
              <InfoRow icon="checkmark-done-outline" label="Xác thực email" value={displayProfile?.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'} />
              {facebookAccount && !displayProfile?.isEmailVerified && (
                <TouchableOpacity style={styles.verifyEmailButton} onPress={() => setVerifyEmailVisible(true)} activeOpacity={0.84}>
                  <Ionicons name="mail-unread-outline" size={18} color="#FFF" />
                  <Text style={styles.verifyEmailButtonText}>Xác thực email bằng OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.chartPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{getHealthRangeTitle(healthRange)}</Text>
                <Text style={styles.rangeLabel}>{selectedHealthRange.label}</Text>
              </View>

              <View style={styles.rangeTabs}>
                {healthRangeOptions.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.rangeTab, healthRange === item.key && styles.rangeTabActive]}
                    onPress={() => setHealthRange(item.key)}
                    activeOpacity={0.84}
                  >
                    <Text style={[styles.rangeTabText, healthRange === item.key && styles.rangeTabTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {loadingHealth && !healthSummary ? (
                <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
              ) : healthCharts.length === 0 ? (
                <Text style={styles.chartEmptyText}>Chưa đủ dữ liệu để hiển thị biểu đồ đẹp. Hãy check-in hoặc lưu thêm hoạt động trong khoảng thời gian này.</Text>
              ) : (
                healthCharts.map((chart) => (
                  <HealthLineChart
                    key={chart.key}
                    title={chart.title}
                    subtitle={chart.subtitle}
                    color={chart.color}
                    data={chart.data}
                    maxValue={chart.maxValue}
                    reverseGood={chart.reverseGood}
                    valueSuffix={chart.valueSuffix}
                  />
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.postsBlock}>
            {loadingPosts ? (
              <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
            ) : visiblePosts.length === 0 ? (
              <Text style={styles.emptyText}>{activeTab === 'saved' ? 'Bạn chưa lưu bài viết nào.' : 'Bạn chưa đăng bài viết nào.'}</Text>
            ) : (
              visiblePosts.map((item) => (
                <PostCard
                  key={item.id}
                  post={item}
                  onLike={handleLike}
                  onSave={handleSave}
                  onComment={setCommentPostId}
                />
              ))
            )}
          </View>
        )}

        {(loadingProfile && !profile) && <ActivityIndicator color={Colors.light.primary} style={styles.loader} />}
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        profile={displayProfile}
        onClose={() => setEditVisible(false)}
        onSaved={async (nextProfile) => {
          setProfile(nextProfile);
          await updateUser(nextProfile);
          setEditVisible(false);
        }}
      />

      <EmailVerificationModal
        visible={verifyEmailVisible}
        onClose={() => setVerifyEmailVisible(false)}
        onVerified={async (nextProfile) => {
          setProfile(nextProfile);
          await updateUser(nextProfile);
          setVerifyEmailVisible(false);
          Alert.alert('Xác thực thành công', 'Email của bạn đã được xác thực.');
        }}
      />

      <CommentModal
        visible={!!commentPostId}
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#1D6B63" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HealthLineChart({
  title,
  subtitle,
  data,
  maxValue,
  color,
  reverseGood,
  valueSuffix = '',
}: {
  title: string;
  subtitle: string;
  data: HealthChartPoint[];
  maxValue: number;
  color: string;
  reverseGood?: boolean;
  valueSuffix?: string;
}) {
  const width = 280;
  const height = 96;
  const padding = 12;
  const safeMax = Math.max(maxValue, 1);
  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1);
    const normalized = item.value === null ? 0 : Math.min(Math.max(item.value / safeMax, 0), 1);
    const y = padding + (1 - normalized) * (height - padding * 2);
    return { x, y, value: item.value };
  });
  const validPoints = points.filter((point): point is { x: number; y: number; value: number } => point.value !== null);
  const path = buildSmoothPath(validPoints);
  const latest = validPoints[validPoints.length - 1]?.value ?? null;
  const first = validPoints[0]?.value ?? null;
  const trend = latest !== null && first !== null ? latest - first : 0;
  const trendText = Math.abs(trend) < 0.1
    ? 'Ổn định'
    : reverseGood
      ? trend <= 0 ? 'Đang giảm' : 'Cần chú ý'
      : trend >= 0 ? 'Đang tốt lên' : 'Cần chú ý';
  const labelStep = Math.ceil(Math.max(1, data.length / 6));
  const labels = data.filter((_, index) => index % labelStep === 0 || index === data.length - 1);

  return (
    <View style={styles.chartItem}>
      <View style={styles.chartTop}>
        <View style={styles.chartTitleBlock}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartTrend}>{subtitle} · {trendText}</Text>
        </View>
        <Text style={[styles.chartScore, { color }]}>
          {latest === null ? '--' : formatMetricValue(latest, valueSuffix)}
        </Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {path ? (
          <Path
            d={`${path} L ${validPoints[validPoints.length - 1].x} ${height - padding} L ${validPoints[0].x} ${height - padding} Z`}
            fill={color}
            opacity={0.08}
          />
        ) : null}
        {path ? <Path d={path} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {validPoints.map((point, index) => (
          <Circle key={`${title}-${index}`} cx={point.x} cy={point.y} r={index === validPoints.length - 1 ? 4.2 : 3.2} fill="#FFF" stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {labels.map((item, index) => <Text key={`${title}-${item.date}-${index}`} style={styles.chartLabel}>{item.label}</Text>)}
      </View>
    </View>
  );
}

function buildProfileHealthCharts(daily: DailyHealthPoint[], range: HealthRangeKey): ProfileHealthChart[] {
  const moodPoints = toHealthChartPoints(daily, range, (item) => item.mood_score);
  const assessmentPoints = toHealthChartPoints(daily, range, (item) => item.assessment_severity);
  const sleepPoints = toHealthChartPoints(daily, range, (item) => item.sleep_minutes > 0 ? item.sleep_minutes : null);
  const breathingPoints = toHealthChartPoints(daily, range, (item) => item.breathing_minutes > 0 ? item.breathing_minutes : null);

  const charts: ProfileHealthChart[] = [
    {
      key: 'mood',
      title: 'Tâm trạng',
      subtitle: 'Điểm check-in 1-5',
      color: '#1D6B63',
      maxValue: 5,
      data: moodPoints,
    },
    {
      key: 'assessment',
      title: 'Mức độ bài test',
      subtitle: '0 ổn định, 4 rất nặng',
      color: '#7350A6',
      maxValue: 4,
      data: assessmentPoints,
      reverseGood: true,
      allowZero: true,
    },
    {
      key: 'sleep',
      title: 'Giấc ngủ',
      subtitle: 'Số phút đã nghe',
      color: '#2F6EDB',
      maxValue: getMaxPointValue(sleepPoints, 30),
      data: sleepPoints,
      valueSuffix: 'p',
    },
    {
      key: 'breathing',
      title: 'Hít thở',
      subtitle: 'Số phút luyện tập',
      color: '#D77948',
      maxValue: getMaxPointValue(breathingPoints, 10),
      data: breathingPoints,
      valueSuffix: 'p',
    },
  ];

  return charts.filter((chart) => hasEnoughChartPoints(chart.data, !!chart.allowZero));
}

function toHealthChartPoints(
  daily: DailyHealthPoint[],
  range: HealthRangeKey,
  valueSelector: (item: DailyHealthPoint) => number | null | undefined,
): HealthChartPoint[] {
  return daily.map((item) => {
    const rawValue = valueSelector(item);
    const value = rawValue === null || rawValue === undefined ? null : Number(rawValue);

    return {
      date: item.date,
      label: formatChartPointLabel(item.date, range),
      value: value !== null && Number.isFinite(value) ? value : null,
    };
  });
}

function hasEnoughChartPoints(data: HealthChartPoint[], allowZero = false) {
  const validPointCount = data.filter((item) => {
    if (item.value === null) return false;
    return allowZero ? item.value >= 0 : item.value > 0;
  }).length;

  return validPointCount >= 2;
}

function getMaxPointValue(data: HealthChartPoint[], fallback: number) {
  const maxValue = Math.max(...data.map((item) => item.value ?? 0));
  return Math.max(fallback, maxValue);
}

function formatMetricValue(value: number, suffix = '') {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}${suffix}`;
}

function formatChartPointLabel(value: string, range: HealthRangeKey) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  if (range === 'week') {
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
  }

  if (range === 'year') {
    return `T${date.getMonth() + 1}`;
  }

  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function getHealthRangeTitle(range: HealthRangeKey) {
  if (range === 'month') return 'Sức khỏe tháng này';
  if (range === 'year') return 'Sức khỏe năm nay';
  return 'Sức khỏe tuần này';
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function EditProfileModal({
  visible,
  profile,
  onClose,
  onSaved,
}: {
  visible: boolean;
  profile: ProfileDetails | null;
  onClose: () => void;
  onSaved: (profile: ProfileDetails) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFullName(profile?.fullName || '');
    setBio(profile?.bio || '');
    setAvatarUrl(profile?.avatarUrl || null);
  }, [profile, visible]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thiếu họ tên', 'Vui lòng nhập họ tên của bạn.');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl?.startsWith('file:')) {
        const fileName = avatarUrl.split('/').pop() || `avatar_${Date.now()}.jpg`;
        const uploadInfo = await socialService.uploadMedia(avatarUrl, fileName, 'image/jpeg');
        finalAvatarUrl = uploadInfo.publicUrl;
      }

      const nextProfile = await profileService.updateMe({
        fullName: fullName.trim(),
        avatarUrl: finalAvatarUrl,
        bio: bio.trim() || null,
      });
      onSaved(nextProfile);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Không thể cập nhật hồ sơ lúc này.';
      Alert.alert('Cập nhật thất bại', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} disabled={saving} style={styles.modalSide}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Lưu</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} disabled={saving}>
              <Image source={{ uri: getAvatarUri(avatarUrl, fullName) }} style={styles.editAvatar} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ tên"
              placeholderTextColor="#8B9693"
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Giới thiệu</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Viết vài dòng về bạn"
              placeholderTextColor="#8B9693"
              multiline
              maxLength={1000}
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Ảnh đại diện URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl || ''}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor="#8B9693"
              autoCapitalize="none"
              editable={!saving}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EmailVerificationModal({
  visible,
  onClose,
  onVerified,
}: {
  visible: boolean;
  onClose: () => void;
  onVerified: (profile: ProfileDetails) => void;
}) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEmail('');
    setOtp('');
    setOtpSent(false);
    setLoading(false);
  }, [visible]);

  const requestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Email chưa hợp lệ', 'Vui lòng nhập email hợp lệ để nhận mã OTP.');
      return;
    }

    setLoading(true);
    try {
      await profileService.requestEmailVerificationOtp(normalizedEmail);
      setOtpSent(true);
      Alert.alert('Đã gửi OTP', 'Vui lòng kiểm tra email và nhập mã xác thực.');
    } catch (error: any) {
      Alert.alert('Không thể gửi OTP', getApiErrorMessage(error, 'Vui lòng thử lại sau.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      Alert.alert('OTP chưa hợp lệ', 'Mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const nextProfile = await profileService.verifyEmailOtp(normalizedEmail, normalizedOtp);
      onVerified(nextProfile);
    } catch (error: any) {
      Alert.alert('Xác thực thất bại', getApiErrorMessage(error, 'Mã OTP không đúng hoặc đã hết hạn.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.modalSide}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Xác thực email</Text>
            <View style={styles.modalSide} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.verifyIntroIcon}>
              <Ionicons name="mail-open-outline" size={30} color="#1D6B63" />
            </View>
            <Text style={styles.verifyTitle}>Nhận mã OTP qua email</Text>
            <Text style={styles.verifyDescription}>
              Email sẽ được dùng để xác thực tài khoản Facebook của bạn. Địa chỉ email không hiển thị công khai trên hồ sơ.
            </Text>

            <Text style={styles.inputLabel}>Email xác thực</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ban@example.com"
              placeholderTextColor="#8B9693"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!otpSent && !loading}
            />

            {otpSent && (
              <>
                <Text style={styles.inputLabel}>Mã OTP</Text>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6 chữ số"
                  placeholderTextColor="#8B9693"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={requestOtp} disabled={loading}>
                    <Text style={styles.otpActionText}>Gửi lại OTP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} disabled={loading}>
                    <Text style={styles.otpActionText}>Đổi email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.verifySubmitButton, loading && styles.verifySubmitButtonDisabled]}
              onPress={otpSent ? verifyOtp : requestOtp}
              disabled={loading}
              activeOpacity={0.84}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.verifySubmitText}>{otpSent ? 'Xác nhận OTP' : 'Gửi mã OTP'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F2' },
  content: { padding: Spacing.md, paddingBottom: 112 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  eyebrow: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: '#6B7B77', textTransform: 'uppercase' },
  title: { fontFamily: 'Manrope', fontSize: 28, fontWeight: '900', color: '#144E49' },
  accountTitle: { fontFamily: 'Manrope', fontSize: 22, fontWeight: '900', color: '#144E49' },
  logoutIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FBEAEA', alignItems: 'center', justifyContent: 'center' },
  logoutButton: { minHeight: 38, borderRadius: 19, backgroundColor: '#FBEAEA', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 13 },
  logoutText: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#A33A3A' },
  profilePanel: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(20,78,73,0.12)' },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#DCE9E6' },
  profileText: { flex: 1, marginLeft: Spacing.md, minWidth: 0 },
  name: { fontFamily: 'Manrope', fontSize: 21, fontWeight: '900', color: '#111817' },
  email: { fontFamily: 'Manrope', fontSize: 13, color: '#65726F', marginTop: 3 },
  emailStatus: { fontFamily: 'Manrope', fontSize: 13, color: '#65726F', marginTop: 3 },
  providerBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#E6F3F0' },
  providerText: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '800', color: '#1D6B63' },
  editButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1D6B63', alignItems: 'center', justifyContent: 'center' },
  bio: { fontFamily: 'Manrope', fontSize: 14, color: '#4D5B58', lineHeight: 21, marginTop: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statItem: { flex: 1, minHeight: 72, borderRadius: BorderRadius.sm, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(20,78,73,0.12)' },
  statValue: { fontFamily: 'Manrope', fontSize: 17, fontWeight: '900', color: '#144E49' },
  statLabel: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '700', color: '#697774', marginTop: 3 },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.md },
  tabButton: { flex: 1, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(20,78,73,0.14)' },
  tabButtonActive: { backgroundColor: '#1D6B63' },
  tabButtonText: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#55736E' },
  tabButtonTextActive: { color: '#FFF' },
  infoPanel: { backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E6F3F0', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: { fontFamily: 'Manrope', fontSize: 12, color: '#6C7775' },
  infoValue: { fontFamily: 'Manrope', fontSize: 15, fontWeight: '800', color: '#16211F', marginTop: 2 },
  verifyEmailButton: { minHeight: 46, borderRadius: BorderRadius.sm, backgroundColor: '#1D6B63', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  verifyEmailButtonText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '900', color: '#FFF' },
  chartPanel: { marginTop: Spacing.md, backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: 'Manrope', fontSize: 18, fontWeight: '900', color: '#144E49' },
  rangeLabel: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '800', color: '#7350A6', backgroundColor: '#EEE4FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  rangeTabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  rangeTab: { flex: 1, height: 36, borderRadius: 18, backgroundColor: '#F4F7F6', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#DDE7E4' },
  rangeTabActive: { backgroundColor: '#1D6B63', borderColor: '#1D6B63' },
  rangeTabText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '900', color: '#55736E' },
  rangeTabTextActive: { color: '#FFF' },
  chartEmptyText: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 20, color: '#697774', textAlign: 'center', paddingVertical: Spacing.lg },
  chartItem: { paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E9EFED' },
  chartTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitleBlock: { flex: 1, minWidth: 0, marginRight: Spacing.sm },
  chartTitle: { fontFamily: 'Manrope', fontSize: 15, fontWeight: '900', color: '#17211F' },
  chartTrend: { fontFamily: 'Manrope', fontSize: 12, color: '#697774', marginTop: 2 },
  chartScore: { fontFamily: 'Manrope', fontSize: 24, fontWeight: '900' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  chartLabel: { fontFamily: 'Manrope', fontSize: 10, color: '#7D8986' },
  postsBlock: { minHeight: 180 },
  loader: { marginVertical: Spacing.lg },
  emptyText: { textAlign: 'center', marginTop: Spacing.xl, fontFamily: 'Manrope', fontSize: 15, color: Colors.light.onSurfaceVariant },
  modalRoot: { flex: 1, backgroundColor: '#FAF8F2' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE5E2' },
  modalSide: { width: 64 },
  cancelText: { fontFamily: 'Manrope', fontSize: 16, fontWeight: '700', color: '#65726F' },
  modalTitle: { fontFamily: 'Manrope', fontSize: 18, fontWeight: '900', color: '#14201E' },
  saveButton: { width: 64, height: 36, borderRadius: 18, backgroundColor: '#1D6B63', alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '900', color: '#FFF' },
  modalContent: { padding: Spacing.md, paddingBottom: 48 },
  avatarPicker: { alignSelf: 'center', marginBottom: Spacing.lg },
  editAvatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#DCE9E6' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: '#1D6B63', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FAF8F2' },
  inputLabel: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#394541', marginBottom: 7, marginTop: Spacing.sm },
  input: { minHeight: 48, borderRadius: BorderRadius.sm, backgroundColor: '#FFF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#DDE5E2', paddingHorizontal: Spacing.md, fontFamily: 'Manrope', fontSize: 15, color: '#15201E' },
  bioInput: { minHeight: 116, paddingTop: 12, textAlignVertical: 'top', lineHeight: 21 },
  verifyIntroIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#DDF4F0', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  verifyTitle: { fontFamily: 'Manrope', fontSize: 20, fontWeight: '900', color: '#144E49', textAlign: 'center' },
  verifyDescription: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 20, color: '#66726F', textAlign: 'center', marginTop: 6, marginBottom: Spacing.md },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  otpActionText: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#1D6B63' },
  verifySubmitButton: { height: 48, borderRadius: 24, backgroundColor: '#1D6B63', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  verifySubmitButtonDisabled: { opacity: 0.65 },
  verifySubmitText: { fontFamily: 'Manrope', fontSize: 15, fontWeight: '900', color: '#FFF' },
});
