import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Shadows, Spacing } from '../../constants/theme';
import { getAssessmentAdvice } from '../utils/assessmentAdvice';

interface ResultGaugeProps {
  result: any;
  onClose?: () => void;
}

const palette = {
  canvas: '#FAF8F2',
  card: '#FFFFFF',
  text: '#111817',
  muted: '#65736F',
  primary: '#1D6B63',
  primaryDark: '#15554D',
  green: '#84C341',
  yellow: '#F4C04F',
  orange: '#F47B3D',
  red: '#D94B38',
  redDark: '#B42318',
  blueSoft: '#E8F5F2',
  redSoft: '#FFF1EE',
  border: 'rgba(20,78,73,0.12)',
  divider: 'rgba(20,78,73,0.09)',
};

const severityLevels = [
  {
    label: 'Bình thường',
    status: 'Ổn định',
    color: palette.green,
    icon: 'shield-checkmark-outline',
  },
  {
    label: 'Nhẹ',
    status: 'Cần chú ý',
    color: palette.green,
    icon: 'leaf-outline',
  },
  {
    label: 'Vừa',
    status: 'Nên hỗ trợ',
    color: palette.yellow,
    icon: 'alert-circle-outline',
  },
  {
    label: 'Nặng',
    status: 'Cần can thiệp',
    color: palette.orange,
    icon: 'warning-outline',
  },
  {
    label: 'Rất nặng',
    status: 'Ưu tiên an toàn',
    color: palette.red,
    icon: 'medical-outline',
  },
] as const;

const categoryLabels: Record<string, string> = {
  Anxiety: 'Lo âu',
  Depression: 'Trầm cảm',
  Stress: 'Căng thẳng',
  Total: 'Tổng điểm',
};

const assessmentTitles: Record<string, string> = {
  'DASS-21': 'Kết quả test DASS-21',
  'PHQ-9': 'Kết quả test PHQ-9',
  'GAD-7': 'Kết quả test GAD-7',
  SAS: 'Kết quả test Lo âu SAS',
  RADS: 'Kết quả test Trầm cảm RADS',
};

const mojibakeFixes: Record<string, string> = {
  'BÃ¬nh thÆ°á»ng': 'Bình thường',
  'Nháº¹': 'Nhẹ',
  'Vá»«a': 'Vừa',
  'Náº·ng': 'Nặng',
  'Ráº¥t náº·ng': 'Rất nặng',
  'Nguy cÆ¡ nháº¹': 'Nguy cơ nhẹ',
  'Lo Ã¢u': 'Lo âu',
  'Lo Ã¢u nháº¹': 'Lo âu nhẹ',
  'Lo Ã¢u vá»«a': 'Lo âu vừa',
  'Lo Ã¢u náº·ng': 'Lo âu nặng',
  'Lo Ã¢u nghiÃªm trá»ng': 'Lo âu nghiêm trọng',
  'Lo Ã¢u cá»±c ká»³ nghiÃªm trá»ng': 'Lo âu cực kỳ nghiêm trọng',
  'Lo Ã¢u nháº¹ Ä‘áº¿n vá»«a': 'Lo âu nhẹ đến vừa',
  'Tráº§m cáº£m': 'Trầm cảm',
  'Tráº§m cáº£m nháº¹': 'Trầm cảm nhẹ',
  'Tráº§m cáº£m vá»«a': 'Trầm cảm vừa',
  'Tráº§m cáº£m náº·ng vá»«a': 'Trầm cảm nặng vừa',
  'Tráº§m cáº£m nghiÃªm trá»ng': 'Trầm cảm nghiêm trọng',
  'Tráº§m cáº£m lÃ¢m sÃ ng': 'Trầm cảm lâm sàng',
};

export default function ResultGauge({ result, onClose }: ResultGaugeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const severity = Math.min(Math.max(Number(result?.overall_severity || 0), 0), 4);
  const currentTone = severityLevels[severity] || severityLevels[0];
  const assessmentCode = result?.assessment_code || 'Bài test';
  const classifications = toRecord(result?.classifications);
  const finalScores = toRecord(result?.final_scores);
  const classificationEntries = Object.entries(classifications);
  const hasRedAlert = Boolean(result?.is_red_alert);
  const completedAt = formatDate(result?.created_at);
  const advice = useMemo(() => getAssessmentAdvice(result), [result]);
  const resultPercent = Math.round((severity / 4) * 100);
  const conclusionText = getConclusionText(advice, currentTone.label, hasRedAlert);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: severity / 4,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, severity]);

  const spin = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-85deg', '85deg'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, Shadows.ambient]}>
        <Text style={styles.title}>{assessmentTitles[assessmentCode] || `Kết quả test ${assessmentCode}`}</Text>
        {completedAt ? <Text style={styles.completedAt}>Ngày làm: {completedAt}</Text> : null}

        <View style={styles.gaugeSection}>
          <View style={styles.gaugeWrapper}>
            <Svg width={270} height={158} viewBox="0 0 270 158" style={styles.gaugeSvg}>
              {/* Các cung màu */}
              <Path d="M 35 126 A 100 100 0 0 1 78 43" stroke={palette.green} strokeWidth={24} fill="none" strokeLinecap="butt" />
              <Path d="M 78 43 A 100 100 0 0 1 108 30" stroke={palette.yellow} strokeWidth={24} fill="none" strokeLinecap="butt" />
              <Path d="M 108 30 A 100 100 0 0 1 135 25" stroke={palette.orange} strokeWidth={24} fill="none" strokeLinecap="butt" />
              <Path d="M 135 25 A 100 100 0 0 1 235 126" stroke={palette.red} strokeWidth={24} fill="none" strokeLinecap="butt" />

              {/* Các điểm số tại giao điểm màu và đầu/cuối vòng */}
              <SvgText x={35} y={145} fill="#1E2A27" fontSize={11} fontWeight="400" textAnchor="middle">0</SvgText>
              <SvgText x={78} y={20} fill="#1E2A27" fontSize={11} fontWeight="400" textAnchor="middle">14</SvgText>
              <SvgText x={108} y={12} fill="#1E2A27" fontSize={11} fontWeight="400" textAnchor="middle">20</SvgText>
              <SvgText x={135} y={8} fill="#1E2A27" fontSize={11} fontWeight="400" textAnchor="middle">30</SvgText>
              <SvgText x={235} y={145} fill="#1E2A27" fontSize={11} fontWeight="400" textAnchor="middle">63</SvgText>
            </Svg>

            <Animated.View style={[styles.needleContainer, { transform: [{ rotate: spin }] }]}>
              <Svg width={22} height={98} viewBox="0 0 22 98">
                <Polygon points="11,0 18,88 11,98 4,88" fill="#171D1B" />
              </Svg>
            </Animated.View>
            <View style={styles.needleBase} />

            <View style={[styles.percentBadge, { backgroundColor: currentTone.color }]}>
              <Text style={styles.percentText}>{resultPercent}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Kết luận:</Text>
        <View style={[styles.conclusionBox, { backgroundColor: currentTone.color }]}>
          <Ionicons name={currentTone.icon as any} size={20} color="#FFFFFF" />
          <Text style={styles.conclusionText}>{conclusionText}</Text>
        </View>

        {classificationEntries.length > 0 ? (
          <View style={styles.scoreGrid}>
            {classificationEntries.map(([category, rawLabel]) => {
              const label = normalizeLabel(String(rawLabel));
              const score = finalScores[category];
              const tone = getClassificationTone(label);

              return (
                <View key={category} style={styles.scoreCard}>
                  <Text style={styles.scoreName}>{categoryLabels[category] || category}</Text>
                  <Text style={[styles.scoreValue, { color: tone.color }]}>
                    {score !== undefined ? String(score) : '--'}
                  </Text>
                  <Text style={[styles.scoreClass, { color: tone.color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Lời khuyên của chuyên gia:</Text>
        <View style={styles.adviceCard}>
          {advice.empathyMessage ? <Text style={styles.adviceLead}>{advice.empathyMessage}</Text> : null}
          <Text style={styles.adviceText}>{advice.recommendation}</Text>

          {advice.actionPlan.length > 0 ? (
            <View style={styles.actionList}>
              {advice.actionPlan.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.actionRow}>
                  <View style={styles.actionDot}>
                    <Ionicons name="checkmark" size={13} color={palette.primaryDark} />
                  </View>
                  <Text style={styles.actionText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {hasRedAlert ? (
          <View style={styles.redAlertBox}>
            <Ionicons name="alert-circle" size={20} color={palette.redDark} />
            <Text style={styles.redAlertText}>
              Nếu bạn thấy không an toàn hoặc có ý nghĩ tự làm hại bản thân, hãy gọi 115 hoặc nhờ người thân ở cạnh ngay.
            </Text>
          </View>
        ) : null}

        {onClose ? (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.86}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.closeBtnText}>Làm lại bài Test</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return null;
}

function getClassificationTone(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('nghiêm trọng') || normalized.includes('rất') || normalized.includes('nặng') || normalized.includes('lâm sàng')) {
    return { color: palette.redDark };
  }
  if (normalized.includes('vừa') || normalized.includes('trung')) {
    return { color: palette.orange };
  }
  return { color: palette.green };
}

function getConclusionText(advice: ReturnType<typeof getAssessmentAdvice>, fallbackLabel: string, hasRedAlert: boolean) {
  if (hasRedAlert) {
    return 'Kết quả có tín hiệu cảnh báo cao, bạn nên ưu tiên an toàn và tìm hỗ trợ trực tiếp sớm.';
  }

  if (advice.conclusion) {
    return advice.conclusion;
  }

  if (fallbackLabel === 'Bình thường') {
    return 'Kết quả của bạn đang ở mức ổn định, hãy tiếp tục duy trì các thói quen chăm sóc bản thân.';
  }

  return `Bạn có dấu hiệu ở mức ${fallbackLabel.toLowerCase()}, hãy dành thời gian quan sát và chăm sóc bản thân nhiều hơn.`;
}

function toRecord(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeLabel(value: string) {
  return Object.entries(mojibakeFixes).reduce((text, [broken, fixed]) => text.replaceAll(broken, fixed), value);
}

function formatDate(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: palette.card,
    borderRadius: 0,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 28,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  completedAt: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
  },
  gaugeSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  gaugeWrapper: {
    width: 270,
    height: 178,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  gaugeSvg: {
    position: 'absolute',
    top: 0,
  },
  needleContainer: {
    width: 22,
    height: 98,
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    transformOrigin: 'bottom center',
  },
  needleBase: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    bottom: 39,
    backgroundColor: '#171D1B',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  percentBadge: {
    minWidth: 62,
    height: 34,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 1,
  },
  percentText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '400',
  },
  sectionLabel: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '400',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  conclusionBox: {
    minHeight: 64,
    borderRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  conclusionText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  scoreCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: '#F8FAF9',
    borderRadius: 0,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  scoreName: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '400',
  },
  scoreValue: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '400',
    marginTop: 2,
  },
  scoreClass: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  adviceCard: {
    backgroundColor: palette.blueSoft,
    borderRadius: 0,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(29,107,99,0.14)',
  },
  adviceLead: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  adviceText: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 23,
  },
  actionList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  actionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DFF1F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionText: {
    flex: 1,
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
  },
  redAlertBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: 7,
    padding: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: palette.redSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180,35,24,0.18)',
  },
  redAlertText: {
    flex: 1,
    color: palette.redDark,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  closeBtn: {
    minHeight: 52,
    borderRadius: 0,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '400',
  },
});
