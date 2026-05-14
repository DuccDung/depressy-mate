import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Spacing, BorderRadius } from '../../constants/theme';

interface QuestionnaireModalProps {
  visible: boolean;
  onClose: () => void;
  assessment: any;
  onSubmit: (answers: any[]) => void;
}

const palette = {
  canvas: '#FAF8F2',
  card: '#FFFFFF',
  text: '#111817',
  muted: '#65736F',
  primary: '#1D6B63',
  primarySoft: '#E3F1EE',
  primarySofter: '#F1F8F6',
  danger: '#A33A3A',
  dangerSoft: '#FBEAEA',
  border: 'rgba(20,78,73,0.14)',
  borderStrong: 'rgba(29,107,99,0.34)',
};

export default function QuestionnaireModal({ visible, onClose, assessment, onSubmit }: QuestionnaireModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Key để lưu riêng rẽ từng bài test cho từng user
  const draftKey = `draft_${user?.id}_${assessment?.assessment_code}`;

  useEffect(() => {
    if (visible && assessment) {
      loadDraft();
    }
  }, [visible, assessment]);

  const loadDraft = async () => {
    setLoading(true);
    try {
      const draftString = await AsyncStorage.getItem(draftKey);
      if (draftString) {
        const draft = JSON.parse(draftString);
        Alert.alert('Tiếp tục?', 'Bạn có một bài làm đang dở dang. Bạn muốn tiếp tục hay làm lại từ đầu?', [
          { text: 'Làm lại', onPress: () => { clearDraft(); }, style: 'destructive' },
          { text: 'Tiếp tục', onPress: () => {
            setAnswers(draft.answers);
            setCurrentIndex(draft.currentIndex);
          }}
        ]);
      } else {
        resetState();
      }
    } catch (e) {
      console.log('Error loading draft', e);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (newAnswers: any[], newIndex: number) => {
    try {
      await AsyncStorage.setItem(draftKey, JSON.stringify({ answers: newAnswers, currentIndex: newIndex }));
    } catch (e) {
      console.log('Error saving draft', e);
    }
  };

  const clearDraft = async () => {
    await AsyncStorage.removeItem(draftKey);
    resetState();
  };

  const resetState = () => {
    setCurrentIndex(0);
    setAnswers([]);
  };

  const handleSelectOption = (score: number) => {
    const question = assessment.questions[currentIndex];
    
    // Tạo mảng answers mới, lọc bỏ câu trả lời cũ của câu hỏi này nếu user back lại
    const newAnswers = answers.filter(a => a.question_order !== question.order);
    newAnswers.push({ question_order: question.order, score });

    setAnswers(newAnswers);
    saveDraft(newAnswers, currentIndex);
  };

  const handleConfirmAnswer = () => {
    const question = assessment.questions[currentIndex];
    const currentAnswer = answers.find(a => a.question_order === question.order);
    if (!currentAnswer) return;

    if (currentIndex < assessment.questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveDraft(answers, nextIndex);
    } else {
      // Confirm submit
      Alert.alert('Hoàn thành', 'Bạn đã trả lời hết các câu hỏi. Bạn muốn nộp bài?', [
        { text: 'Kiểm tra lại', style: 'cancel' },
        { text: 'Nộp bài', onPress: () => {
           clearDraft().then(() => onSubmit(answers));
        }}
      ]);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      setCurrentIndex(previousIndex);
      saveDraft(answers, previousIndex);
    }
  };

  const handleClose = () => {
    // Tự động save khi bấm đóng (dù mỗi bước chọn option đã save rồi)
    saveDraft(answers, currentIndex);
    onClose();
  };

  if (!assessment) return null;

  const currentQuestion = assessment.questions[currentIndex];
  // Kiểm tra xem câu này đã được trả lời chưa để highlight option
  const currentAnswer = answers.find(a => a.question_order === currentQuestion?.order);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {loading ? (
          <ActivityIndicator size="large" color={palette.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.82}>
                <Text style={styles.closeText}>Thoát (Lưu nháp)</Text>
              </TouchableOpacity>
              <Text style={styles.progressText}>
                {currentIndex + 1} / {assessment.questions.length}
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / assessment.questions.length) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.questionText}>{currentQuestion?.content}</Text>

              <View style={styles.optionsContainer}>
                {assessment.options.map((option: any, idx: number) => {
                  const isSelected = currentAnswer?.score === option.score;
                  return (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.optionBtn,
                        pressed && styles.optionBtnPressed,
                        isSelected && styles.optionBtnSelected,
                      ]}
                      onPress={() => handleSelectOption(option.score)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
              <TouchableOpacity
                style={[styles.backBtn, currentIndex === 0 && styles.backBtnDisabled]}
                onPress={handleBack}
                disabled={currentIndex === 0}
                activeOpacity={0.82}
              >
                <Text style={[styles.backBtnText, currentIndex === 0 && styles.backBtnTextDisabled]}>Trở lại</Text>
              </TouchableOpacity>

              {currentAnswer ? (
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmAnswer}
                  activeOpacity={0.86}
                >
                  <Text style={styles.confirmBtnText}>
                    {currentIndex === assessment.questions.length - 1 ? 'Nộp bài' : 'Xác nhận'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  loader: {
    marginTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: palette.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  closeBtn: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: palette.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(163,58,58,0.18)',
  },
  closeText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Manrope',
  },
  progressText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Manrope',
    backgroundColor: palette.primarySoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E7EEEB',
    width: '100%',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: palette.primary,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  questionText: {
    fontSize: 21,
    fontWeight: '900',
    color: palette.text,
    marginBottom: Spacing.lg,
    lineHeight: 31,
    fontFamily: 'Manrope',
    backgroundColor: palette.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  optionsContainer: {
    width: '100%',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    paddingVertical: 15,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 58,
  },
  optionBtnPressed: {
    borderColor: palette.borderStrong,
    backgroundColor: '#F3F8F6',
    transform: [{ scale: 0.985 }],
  },
  optionBtnSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySofter,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#B8C7C3',
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  optionText: {
    color: palette.muted,
    fontSize: 15,
    flex: 1,
    fontFamily: 'Manrope',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: palette.primary,
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: palette.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  backBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: '#EEF2F0',
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  backBtnDisabled: {
    opacity: 0.55,
  },
  backBtnText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Manrope',
  },
  backBtnTextDisabled: {
    color: '#8B9693',
  },
  confirmBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Manrope',
  }
});
