import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { AssessmentAdvice } from '../utils/assessmentAdvice';

type AssessmentAdviceModalProps = {
  visible: boolean;
  advice: AssessmentAdvice | null;
  onClose: () => void;
};

const palette = {
  backdrop: 'rgba(17,24,39,0.42)',
  card: '#FFFFFF',
  text: '#111817',
  muted: '#65736F',
  primary: '#1D6B63',
  primarySoft: '#E3F1EE',
  danger: '#B42318',
  dangerSoft: '#FFF3F0',
  border: 'rgba(20,78,73,0.12)',
};

export default function AssessmentAdviceModal({ visible, advice, onClose }: AssessmentAdviceModalProps) {
  if (!advice) return null;

  const toneColor = advice.isUrgent ? palette.danger : advice.color || palette.primary;
  const toneSoft = advice.isUrgent ? palette.dangerSoft : withAlpha(advice.color || palette.primary, 0.18);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.card, Shadows.ambient]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={[styles.iconBubble, { backgroundColor: toneColor }]}>
                <Ionicons name={advice.isUrgent ? 'medical-outline' : 'heart-outline'} size={22} color="#FFFFFF" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Lời khuyên sau bài test</Text>
                <Text style={styles.title}>{advice.title}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.82}>
                <Ionicons name="close" size={22} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={[styles.summaryBox, { backgroundColor: toneSoft, borderColor: withAlpha(toneColor, 0.24) }]}>
                <Text style={[styles.summaryLabel, { color: toneColor }]}>{advice.label}</Text>
                {advice.conclusion ? (
                  <Text style={[styles.conclusion, { color: toneColor }]}>{advice.conclusion}</Text>
                ) : null}
                {advice.empathyMessage ? (
                  <Text style={styles.empathy}>{advice.empathyMessage}</Text>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>Gợi ý dành cho bạn</Text>
              <Text style={styles.recommendation}>{advice.recommendation}</Text>

              {advice.actionPlan.length > 0 ? (
                <View style={styles.actionList}>
                  {advice.actionPlan.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.actionItem}>
                      <View style={[styles.checkIcon, { backgroundColor: toneSoft }]}>
                        <Ionicons name="checkmark" size={15} color={toneColor} />
                      </View>
                      <Text style={styles.actionText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.disclaimer}>
                <Ionicons name="information-circle-outline" size={18} color={palette.muted} />
                <Text style={styles.disclaimerText}>
                  Nội dung này chỉ mang tính tham khảo và không thay thế chẩn đoán hoặc điều trị từ chuyên gia.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: toneColor }]} onPress={onClose} activeOpacity={0.86}>
              <Text style={styles.primaryButtonText}>Mình đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function withAlpha(hex: string, alpha: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    return `rgba(29,107,99,${alpha})`;
  }

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.backdrop,
  },
  safeArea: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    maxHeight: '88%',
    backgroundColor: palette.card,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE7E4',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 17,
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
    fontWeight: '800',
  },
  title: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  summaryBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  conclusion: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
  },
  empathy: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: Spacing.sm,
  },
  recommendation: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actionList: {
    gap: Spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#F8FAF9',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  checkIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionText: {
    flex: 1,
    color: palette.text,
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: Spacing.md,
  },
  disclaimerText: {
    flex: 1,
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 52,
    margin: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '900',
  },
});
