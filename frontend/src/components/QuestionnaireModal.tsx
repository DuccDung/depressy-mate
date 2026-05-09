import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

interface QuestionnaireModalProps {
  visible: boolean;
  onClose: () => void;
  assessment: any;
  onSubmit: (answers: any[]) => void;
}

export default function QuestionnaireModal({ visible, onClose, assessment, onSubmit }: QuestionnaireModalProps) {
  const { user } = useAuth();
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

    // Chuyển câu tiếp theo hoặc hoàn thành
    if (currentIndex < assessment.questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveDraft(newAnswers, nextIndex);
    } else {
      // Confirm submit
      Alert.alert('Hoàn thành', 'Bạn đã trả lời hết các câu hỏi. Bạn muốn nộp bài?', [
        { text: 'Kiểm tra lại', style: 'cancel' },
        { text: 'Nộp bài', onPress: () => {
           clearDraft().then(() => onSubmit(newAnswers));
        }}
      ]);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{marginTop: 50}} />
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Thoát (Lưu nháp)</Text>
              </TouchableOpacity>
              <Text style={styles.progressText}>
                {currentIndex + 1} / {assessment.questions.length}
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${((currentIndex) / assessment.questions.length) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.questionText}>{currentQuestion?.content}</Text>

              <View style={styles.optionsContainer}>
                {assessment.options.map((option: any, idx: number) => {
                  const isSelected = currentAnswer?.score === option.score;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                      onPress={() => handleSelectOption(option.score)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]} />
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} 
                onPress={handleBack}
                disabled={currentIndex === 0}
              >
                <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>Trở lại</Text>
              </TouchableOpacity>
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
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.outlineVariant,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: Colors.light.onSurfaceVariant,
    fontSize: 16,
    fontFamily: 'Manrope',
  },
  progressText: {
    color: Colors.light.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.light.surfaceContainerLow,
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.light.primary,
  },
  content: {
    padding: Spacing.xl,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    marginBottom: Spacing.xl,
    lineHeight: 32,
    fontFamily: 'Manrope',
  },
  optionsContainer: {
    width: '100%',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLowest,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.outlineVariant,
  },
  optionBtnSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '1A', // transparent primary
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.outlineVariant,
    marginRight: Spacing.md,
  },
  radioSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  optionText: {
    color: Colors.light.onSurfaceVariant,
    fontSize: 16,
    flex: 1,
    fontFamily: 'Manrope',
  },
  optionTextSelected: {
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.md,
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Colors.light.outlineVariant,
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.surfaceContainerHigh,
    borderRadius: BorderRadius.sm,
  },
  navBtnDisabled: {
    backgroundColor: 'transparent',
  },
  navBtnText: {
    color: Colors.light.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
  },
  navBtnTextDisabled: {
    color: Colors.light.onSurfaceVariant,
  }
});
