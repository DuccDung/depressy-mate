import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AssessmentFlow from '../components/AssessmentFlow';
import BreathingExerciseScreen from './Home/BreathingExerciseScreen';
import SleepScreen from './Home/SleepScreen';
import CheckinScreen from './Home/CheckinScreen';
import JournalScreen from './Home/JournalScreen';
import SocialFeedScreen from './socials/SocialFeedScreen';
import { UserAvatar } from '../components/socials/UserAvatar';
import { CommunitySection } from '../components/home/CommunitySection';
import { DailyHealthPoint, healthService, HealthSummary } from '../services/healthService';
import type { MainTabParamList } from '../navigation/MainTabNavigator';

type HomeFeature = 'assessments' | 'breathe' | 'sleep' | 'checkin' | 'journal' | 'socials' | null;

const severityLabels = ['Ổn định', 'Nhẹ', 'Vừa', 'Nặng', 'Rất nặng'];
const moodLabels: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Buồn',
  3: 'Ổn',
  4: 'Tốt',
  5: 'Rất tốt',
};

const quickActions = [
  {
    id: 'checkin',
    title: 'Cập nhật trạng thái',
    subtitle: 'Ghi nhận cảm xúc',
    icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
    iconSet: 'ion',
    color: '#7350A6',
    bg: '#EEE4FF',
  },
  {
    id: 'assessments',
    title: 'Bài test tâm lý',
    subtitle: 'Theo dõi mức độ',
    icon: 'clipboard-text-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
    iconSet: 'material',
    color: '#1D6B63',
    bg: '#DDF4F0',
  },
  {
    id: 'breathe',
    title: 'Hít thở',
    subtitle: 'Phiên 2 phút',
    icon: 'weather-windy' as keyof typeof MaterialCommunityIcons.glyphMap,
    iconSet: 'material',
    color: '#0E8F80',
    bg: '#D9F6EF',
  },
  {
    id: 'journal',
    title: 'Nhật ký',
    subtitle: 'Viết điều đang nghĩ',
    icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
    iconSet: 'ion',
    color: '#2F6EDB',
    bg: '#E3EDFF',
  },
  {
    id: 'sleep',
    title: 'Giấc ngủ',
    subtitle: 'Âm thanh thư giãn',
    icon: 'moon-outline' as keyof typeof Ionicons.glyphMap,
    iconSet: 'ion',
    color: '#D77948',
    bg: '#FFEADB',
  },
  {
    id: 'socials',
    title: 'Cộng đồng',
    subtitle: 'Chia sẻ và lưu bài',
    icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
    iconSet: 'ion',
    color: '#8B4D7D',
    bg: '#FFE5F4',
  },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Home'>>();
  const [activeFeature, setActiveFeature] = useState<HomeFeature>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await healthService.getSummary(30);
      setSummary(data);
    } catch (error) {
      console.error('Could not load health dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!activeFeature) {
        loadSummary();
      }
    }, [activeFeature, loadSummary])
  );

  const closeFeature = () => {
    setActiveFeature(null);
    loadSummary(true);
  };

  const openExploreCommunity = useCallback((focusPostId?: string) => {
    navigation.navigate('Explore', {
      initialTab: 'community',
      focusPostId,
    });
  }, [navigation]);

  if (activeFeature === 'checkin') return <CheckinScreen onClose={closeFeature} />;
  if (activeFeature === 'sleep') return <SleepScreen onClose={closeFeature} />;
  if (activeFeature === 'breathe') return <BreathingExerciseScreen onClose={closeFeature} />;
  if (activeFeature === 'journal') return <JournalScreen onClose={closeFeature} />;
  if (activeFeature === 'socials') return <SocialFeedScreen onClose={closeFeature} />;

  if (activeFeature === 'assessments') {
    return (
      <SafeAreaView style={styles.container}>
        <AssessmentFlow onClose={closeFeature} />
      </SafeAreaView>
    );
  }

  const latestSeverity = summary?.latest.assessment_severity ?? null;
  const latestMood = summary?.latest.mood_score ?? null;
  const weeklyData = (summary?.daily || []).slice(-7);
  const activityData = weeklyData.map((item) => ({
    ...item,
    activity_minutes: item.breathing_minutes + item.sleep_minutes,
  }));
  const visibleCharts = [
    {
      key: 'assessment',
      title: 'Mức độ bài test',
      subtitle: '0 là ổn định, 4 là rất nặng',
      color: '#7350A6',
      maxValue: 4,
      data: weeklyData,
      valueKey: 'assessment_severity' as const,
    },
    {
      key: 'mood',
      title: 'Tâm trạng',
      subtitle: '1 rất tệ đến 5 rất tốt',
      color: '#1D6B63',
      maxValue: 5,
      data: weeklyData,
      valueKey: 'mood_score' as const,
    },
    {
      key: 'activity',
      title: 'Hít thở và ngủ',
      subtitle: 'Tổng phút thư giãn mỗi ngày',
      color: '#D77948',
      maxValue: Math.max(30, ...activityData.map((item) => item.activity_minutes)),
      data: activityData,
      valueKey: 'activity_minutes' as const,
    },
  ].filter((chart) => hasChartData(chart.data, chart.valueKey));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} colors={[Colors.light.primary]} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()}, {user?.fullName || 'bạn'}</Text>
            <Text style={styles.subtitle}>Theo dõi tiến triển sức khỏe của bạn theo thời gian.</Text>
          </View>
          <UserAvatar
            userId={user?.id || ''}
            size={46}
            prefetchData={{ avatarUrl: user?.avatarUrl, name: user?.fullName }}
          />
        </View>

        {loading && !summary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu sức khỏe...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Tổng quan 7 ngày</Text>
                  <Text style={styles.heroTitle}>{summary?.insight || 'Hãy bắt đầu ghi nhận hôm nay.'}</Text>
                </View>
                <SeverityRing value={latestSeverity ?? 0} />
              </View>

              <View style={styles.heroStats}>
                <MiniMetric label="Mức test gần nhất" value={latestSeverity === null ? '--' : severityLabels[latestSeverity]} />
                <MiniMetric label="Tâm trạng gần nhất" value={latestMood === null ? '--' : moodLabels[Math.round(latestMood)] || '--'} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hoạt động đã lưu</Text>
            </View>
            <View style={styles.statsGrid}>
              <DashboardStat icon="analytics-outline" label="Bài test" value={String(summary?.totals.assessments || 0)} />
              <DashboardStat icon="heart-outline" label="Check-in" value={String(summary?.totals.checkins || 0)} />
              <DashboardStat icon="book-outline" label="Nhật ký" value={String(summary?.totals.journals || 0)} />
              <DashboardStat icon="leaf-outline" label="Hít thở" value={`${summary?.totals.breathing_minutes || 0}p`} />
              <DashboardStat icon="moon-outline" label="Ngủ" value={`${summary?.totals.sleep_minutes || 0}p`} />
              <DashboardStat icon="pulse-outline" label="Theo dõi" value={`${summary?.range.days || 30} ngày`} />
            </View>

            {!!summary?.latest_assessments.length && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Bài test gần nhất</Text>
                </View>
                <View style={styles.assessmentList}>
                  {summary.latest_assessments.slice(0, 4).map((item) => (
                    <View key={item.id} style={styles.assessmentItem}>
                      <View>
                        <Text style={styles.assessmentCode}>{item.assessment_code}</Text>
                        <Text style={styles.assessmentDate}>{formatShortDate(item.date)}</Text>
                      </View>
                      <View style={[styles.severityPill, { backgroundColor: getSeverityColor(item.overall_severity) }]}>
                        <Text style={styles.severityText}>{severityLabels[item.overall_severity]}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hành động nhanh</Text>
        </View>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.quickCard, { backgroundColor: item.bg }]}
              onPress={() => setActiveFeature(item.id as HomeFeature)}
              activeOpacity={0.82}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color }]}>
                {item.iconSet === 'material' ? (
                  <MaterialCommunityIcons name={item.icon as any} size={22} color="#FFF" />
                ) : (
                  <Ionicons name={item.icon as any} size={22} color="#FFF" />
                )}
              </View>
              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <CommunitySection
          onSeeAll={() => openExploreCommunity()}
          onVideoPress={(post) => openExploreCommunity(post.id)}
        />

        {!!summary && visibleCharts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Biểu đồ tiến triển</Text>
              <Text style={styles.sectionNote}>7 ngày</Text>
            </View>

            {visibleCharts.map((chart) => (
              <MetricSmoothLineChart
                key={chart.key}
                title={chart.title}
                subtitle={chart.subtitle}
                color={chart.color}
                maxValue={chart.maxValue}
                data={chart.data}
                valueKey={chart.valueKey}
              />
            ))}
          </>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricSmoothLineChart({
  title,
  subtitle,
  data,
  valueKey,
  maxValue,
  color,
}: {
  title: string;
  subtitle: string;
  data: (DailyHealthPoint & { activity_minutes?: number })[];
  valueKey: keyof (DailyHealthPoint & { activity_minutes?: number });
  maxValue: number;
  color: string;
}) {
  const width = 320;
  const height = 126;
  const paddingX = 14;
  const paddingTop = 18;
  const paddingBottom = 20;
  const chartHeight = height - paddingTop - paddingBottom;
  const values = data.map((item) => Number(item[valueKey] ?? NaN));
  const usableValues = values.map((value) => (Number.isFinite(value) ? value : null));
  const latest = [...usableValues].reverse().find((value) => value !== null);
  const safeMax = Math.max(maxValue, 1);
  const points = usableValues.map((value, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(1, usableValues.length - 1);
    const normalized = value === null ? 0 : Math.min(Math.max(value / safeMax, 0), 1);
    const y = paddingTop + chartHeight - normalized * chartHeight;
    return { x, y, value };
  });
  const validPoints = points.filter((point): point is { x: number; y: number; value: number } => point.value !== null);
  const linePath = buildSmoothPath(validPoints);
  const areaPath = validPoints.length > 1
    ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${paddingTop + chartHeight} L ${validPoints[0].x} ${paddingTop + chartHeight} Z`
    : '';

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <Text style={[styles.chartValue, { color }]}>{latest === undefined ? '--' : latest}</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={`M ${paddingX} ${paddingTop + chartHeight} H ${width - paddingX}`} stroke="#E3E8E6" strokeWidth={1} />
        {areaPath ? <Path d={areaPath} fill={color} opacity={0.08} /> : null}
        {linePath ? (
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {validPoints.map((point, index) => (
          <Circle
            key={`${title}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === validPoints.length - 1 ? 4.4 : 3.2}
            fill="#FFF"
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {data.filter((_, index) => index % Math.ceil(Math.max(1, data.length / 5)) === 0).map((item) => (
          <Text key={`${title}-${item.date}`} style={styles.chartLabel}>{formatDayLabel(String(item.date))}</Text>
        ))}
      </View>
    </View>
  );
}

function hasChartData(
  data: (DailyHealthPoint & { activity_minutes?: number })[],
  valueKey: keyof (DailyHealthPoint & { activity_minutes?: number }),
) {
  const validPointCount = data.filter((item) => {
    const rawValue = item[valueKey];
    if (rawValue === null || rawValue === undefined) return false;

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return false;

    return valueKey === 'assessment_severity' ? value >= 0 : value > 0;
  }).length;

  return validPointCount >= 2;
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

function SeverityRing({ value }: { value: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / 4, 0), 1);

  return (
    <View style={styles.ringBox}>
      <Svg width={64} height={64}>
        <Circle cx={32} cy={32} r={radius} stroke="rgba(255,255,255,0.28)" strokeWidth={8} fill="none" />
        <Circle
          cx={32}
          cy={32}
          r={radius}
          stroke="#FFF"
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin="32,32"
        />
      </Svg>
      <Text style={styles.ringText}>{value}</Text>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function DashboardStat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color="#1D6B63" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getSeverityColor(value: number) {
  return ['#DDF4F0', '#FFF3C7', '#FFE1B8', '#FFD6D6', '#E9C0C0'][value] || '#DDF4F0';
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greeting: {
    fontFamily: 'Manrope',
    fontSize: 25,
    fontWeight: '900',
    color: '#144E49',
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    lineHeight: 19,
    marginTop: 4,
  },
  loadingBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#66726F',
    marginTop: Spacing.sm,
  },
  heroCard: {
    backgroundColor: '#1D6B63',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#BFE7E0',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 25,
    marginTop: 7,
    maxWidth: 250,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  miniMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  miniValue: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  miniLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#CFEDE8',
    marginTop: 3,
  },
  ringBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    position: 'absolute',
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    color: '#144E49',
  },
  sectionNote: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#7350A6',
    backgroundColor: '#EEE4FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    color: '#16211F',
  },
  chartSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6D7975',
    marginTop: 3,
  },
  chartValue: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '900',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: '#7D8986',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '31.5%',
    minHeight: 92,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FFF',
    padding: Spacing.sm,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#12201D',
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#687572',
    marginTop: 2,
  },
  assessmentList: {
    gap: Spacing.sm,
  },
  assessmentItem: {
    minHeight: 62,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FFF',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assessmentCode: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '900',
    color: '#16211F',
  },
  assessmentDate: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#73807C',
    marginTop: 3,
  },
  severityPill: {
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  severityText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#24302D',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickCard: {
    width: '48.4%',
    minHeight: 128,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  quickTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '900',
    color: '#111817',
  },
  quickSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#5E6C68',
    marginTop: 4,
  },
});
