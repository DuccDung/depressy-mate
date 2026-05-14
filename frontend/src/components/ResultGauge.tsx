import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';

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
  primarySoft: '#E3F1EE',
  green: '#1D8A68',
  greenSoft: '#E1F4ED',
  amber: '#C98311',
  amberSoft: '#FFF2D1',
  orange: '#D45F22',
  orangeSoft: '#FCE8D8',
  red: '#B42318',
  redSoft: '#FBE4E1',
  border: 'rgba(20,78,73,0.12)',
  divider: 'rgba(20,78,73,0.09)',
};

const severityLevels = [
  {
    label: 'Bình thường',
    status: 'Ổn định',
    color: palette.green,
    soft: palette.greenSoft,
    icon: 'shield-checkmark-outline',
    guidance: 'Kết quả hiện ở vùng an toàn. Hãy tiếp tục duy trì nhịp sinh hoạt, giấc ngủ và các hoạt động giúp bạn hồi phục năng lượng.',
  },
  {
    label: 'Nhẹ / Nguy cơ',
    status: 'Cần chú ý',
    color: palette.green,
    soft: palette.greenSoft,
    icon: 'leaf-outline',
    guidance: 'Có một vài dấu hiệu cần được để ý. Bạn nên giảm tải, nghỉ ngơi đều hơn và theo dõi lại cảm xúc trong vài ngày tới.',
  },
  {
    label: 'Vừa',
    status: 'Nên hỗ trợ',
    color: palette.amber,
    soft: palette.amberSoft,
    icon: 'alert-circle-outline',
    guidance: 'Các chỉ số đang ảnh hưởng rõ hơn đến sinh hoạt. Hãy cân nhắc chia sẻ với người tin cậy hoặc đặt lịch tư vấn chuyên môn.',
  },
  {
    label: 'Nặng',
    status: 'Cần can thiệp',
    color: palette.orange,
    soft: palette.orangeSoft,
    icon: 'warning-outline',
    guidance: 'Mức độ hiện tại cần được hỗ trợ nghiêm túc. Bạn nên liên hệ chuyên gia sức khỏe tâm thần hoặc cơ sở y tế phù hợp.',
  },
  {
    label: 'Rất nặng',
    status: 'Ưu tiên an toàn',
    color: palette.red,
    soft: palette.redSoft,
    icon: 'medical-outline',
    guidance: 'Đây là mức cảnh báo cao. Nếu bạn thấy mất an toàn hoặc có ý nghĩ tự làm hại bản thân, hãy liên hệ cấp cứu 115 hoặc nhờ người thân ở cạnh ngay.',
  },
] as const;

const categoryLabels: Record<string, string> = {
  Anxiety: 'Lo âu',
  Depression: 'Trầm cảm',
  Stress: 'Căng thẳng',
  Total: 'Tổng điểm',
};

const mojibakeFixes: Record<string, string> = {
  'BÃ¬nh thÆ°á»ng': 'Bình thường',
  'Nháº¹': 'Nhẹ',
  'Vá»«a': 'Vừa',
  'Náº·ng': 'Nặng',
  'Ráº¥t náº·ng': 'Rất nặng',
  'Nguy cÆ¡ nháº¹': 'Nguy cơ nhẹ',
  'Lo Ã¢u nháº¹': 'Lo âu nhẹ',
  'Lo Ã¢u vá»«a': 'Lo âu vừa',
  'Lo Ã¢u náº·ng': 'Lo âu nặng',
  'Lo Ã¢u nghiÃªm trá»ng': 'Lo âu nghiêm trọng',
  'Lo Ã¢u cá»±c ká»³ nghiÃªm trá»ng': 'Lo âu cực kỳ nghiêm trọng',
  'Lo Ã¢u nháº¹ Ä‘áº¿n vá»«a': 'Lo âu nhẹ đến vừa',
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

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: severity / 4,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, severity]);

  const spin = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, Shadows.ambient]}>
        <View style={styles.headerRow}>
          <View style={[styles.statusIcon, { backgroundColor: currentTone.soft }]}>
            <Ionicons name={currentTone.icon as any} size={22} color={currentTone.color} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Kết quả đánh giá</Text>
            <Text style={styles.title}>{assessmentCode}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: currentTone.soft }]}>
            <Text style={[styles.statusPillText, { color: currentTone.color }]}>{currentTone.status}</Text>
          </View>
        </View>

        <View style={styles.gaugeSection}>
          <View style={styles.gaugeWrapper}>
            <Svg width={250} height={136} viewBox="0 0 250 136" style={styles.gaugeSvg}>
              <Path d="M 28 116 A 97 97 0 0 1 75 35" stroke={palette.green} strokeWidth={20} fill="none" strokeLinecap="round" />
              <Path d="M 78 35 A 97 97 0 0 1 172 35" stroke={palette.amber} strokeWidth={20} fill="none" strokeLinecap="round" />
              <Path d="M 175 35 A 97 97 0 0 1 222 116" stroke={palette.red} strokeWidth={20} fill="none" strokeLinecap="round" />
            </Svg>

            <Animated.View style={[styles.needleContainer, { transform: [{ rotate: spin }] }]}>
              <View style={styles.needle} />
            </Animated.View>
            <View style={[styles.needleBase, { backgroundColor: currentTone.color }]} />

            <View style={styles.scoreBubble}>
              <Text style={[styles.scoreNumber, { color: currentTone.color }]}>{severity}</Text>
              <Text style={styles.scoreCaption}>/ 4</Text>
            </View>
          </View>

          <Text style={[styles.severityLabel, { color: currentTone.color }]}>
            Mức độ: {currentTone.label}
          </Text>

          <View style={styles.gaugeLegend}>
            <LegendDot color={palette.green} label="Thấp" />
            <LegendDot color={palette.amber} label="Vừa" />
            <LegendDot color={palette.red} label="Cao" />
          </View>
        </View>

        <View style={styles.metaRow}>
          <MetaItem label="Thang đo" value={assessmentCode} />
          <MetaItem label="Mức tổng quan" value={currentTone.label} tone={currentTone.color} />
          {completedAt ? <MetaItem label="Ngày làm" value={completedAt} /> : null}
        </View>

        {classificationEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phân loại chi tiết</Text>
            <View style={styles.classificationList}>
              {classificationEntries.map(([category, rawLabel]) => {
                const label = normalizeLabel(String(rawLabel));
                const score = finalScores[category];
                const tone = getClassificationTone(label);

                return (
                  <View key={category} style={styles.classRow}>
                    <View style={styles.classInfo}>
                      <Text style={styles.className}>{categoryLabels[category] || category}</Text>
                      {score !== undefined ? <Text style={styles.classScore}>Điểm: {String(score)}</Text> : null}
                    </View>
                    <View style={[styles.classPill, { backgroundColor: tone.soft }]}>
                      <Text style={[styles.classPillText, { color: tone.color }]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={[styles.guidanceBox, { backgroundColor: currentTone.soft }]}>
          <Ionicons name="information-circle-outline" size={20} color={currentTone.color} />
          <Text style={[styles.guidanceText, { color: currentTone.color }]}>{currentTone.guidance}</Text>
        </View>

        {hasRedAlert ? (
          <View style={styles.redAlertBox}>
            <Ionicons name="alert-circle" size={20} color={palette.red} />
            <Text style={styles.redAlertText}>
              Kết quả có tín hiệu cảnh báo cao. Hãy ưu tiên an toàn và tìm sự hỗ trợ trực tiếp càng sớm càng tốt.
            </Text>
          </View>
        ) : null}

        {onClose ? (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.86}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.closeBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function MetaItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function getClassificationTone(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('nghiêm trọng') || normalized.includes('rất') || normalized.includes('nặng') || normalized.includes('lâm sàng')) {
    return { color: palette.red, soft: palette.redSoft };
  }
  if (normalized.includes('vừa') || normalized.includes('trung')) {
    return { color: palette.amber, soft: palette.amberSoft };
  }
  return { color: palette.green, soft: palette.greenSoft };
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
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '400',
  },
  title: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 108,
  },
  statusPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  gaugeSection: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  gaugeWrapper: {
    width: 250,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  gaugeSvg: {
    position: 'absolute',
    top: 0,
  },
  needleContainer: {
    width: 4,
    height: 84,
    position: 'absolute',
    bottom: 24,
    alignItems: 'center',
    transformOrigin: 'bottom center',
  },
  needle: {
    width: 4,
    height: 84,
    backgroundColor: '#1B2724',
    borderRadius: 3,
  },
  needleBase: {
    width: 22,
    height: 22,
    borderRadius: 11,
    position: 'absolute',
    bottom: 13,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  scoreBubble: {
    minWidth: 68,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 2,
  },
  scoreNumber: {
    fontFamily: 'Manrope',
    fontSize: 25,
    fontWeight: '400',
  },
  scoreCaption: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 2,
    marginTop: 5,
  },
  severityLabel: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0,
    marginBottom: Spacing.sm,
  },
  gaugeLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 3,
  },
  metaValue: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '400',
  },
  section: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  sectionTitle: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: Spacing.sm,
  },
  classificationList: {
    gap: Spacing.sm,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 46,
  },
  classInfo: {
    flex: 1,
    minWidth: 0,
  },
  className: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '400',
  },
  classScore: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  classPill: {
    maxWidth: '56%',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  classPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '400',
  },
  guidanceBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  guidanceText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  redAlertBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: '#FFF5F3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180,35,24,0.18)',
  },
  redAlertText: {
    flex: 1,
    color: palette.red,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  closeBtn: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '400',
  },
});
