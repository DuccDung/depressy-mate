import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../../constants/theme';
import MoodSelector, { MoodType } from '../../components/checkin/MoodSelector';
import ImagePickerSection from '../../components/checkin/ImagePickerSection';
import api from '../../services/api';

interface CheckinItem {
  id: number;
  user_id: number;
  mood: MoodType;
  note: string | null;
  image_url: string | null;
  created_at: string;
}

const getMoodEmoji = (mood: string) => {
  switch (mood) {
    case 'excellent': return '🤩';
    case 'good': return '😊';
    case 'okay': return '😐';
    case 'sad': return '😢';
    case 'terrible': return '😞';
    default: return '😐';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} - ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

interface Props {
  onClose: () => void;
}

export default function CheckinScreen({ onClose }: Props) {
  const [mood, setMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [history, setHistory] = useState<CheckinItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/checkins?limit=5');
      setHistory(res.data.checkins);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const maxNoteLength = 100;
  const wordCount = note.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!mood) {
      Alert.alert('Chọn trạng thái', 'Vui lòng chọn trạng thái cảm xúc của bạn.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;

      // Upload ảnh nếu có
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);

        const uploadRes = await api.post('/checkins/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        imageUrl = uploadRes.data.image_url;
      }

      // Tạo check-in
      await api.post('/checkins', {
        mood,
        note: note.trim() || null,
        image_url: imageUrl,
      });

      setIsSuccess(true);

      // Tự đóng sau 2 giây
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInUp.springify().damping(12)} style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.successTitle}>
            Đã ghi nhận! 💜
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(400).springify()} style={styles.successSub}>
            Cảm ơn bạn đã chia sẻ trạng thái hôm nay
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cập nhật trạng thái</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro Card */}
          <View style={[styles.introCard, Shadows.ghostBorder]}>
            <View style={styles.introIconBox}>
              <Ionicons name="heart" size={20} color={Colors.light.primary} />
            </View>
            <View style={styles.introTextBox}>
              <Text style={styles.introTitle}>Ghi lại khoảnh khắc</Text>
              <Text style={styles.introSub}>
                Mỗi lần ghi nhận giúp bạn hiểu rõ hơn về cảm xúc của mình
              </Text>
            </View>
          </View>

          {/* Mood Selector */}
          <MoodSelector selected={mood} onSelect={setMood} />

          {/* Note Input */}
          <View style={styles.noteSection}>
            <View style={styles.noteLabelRow}>
              <Text style={styles.noteLabel}>Ghi chú (tuỳ chọn)</Text>
              <Text style={[
                styles.wordCount,
                wordCount > maxNoteLength && styles.wordCountOver,
              ]}>
                {wordCount}/{maxNoteLength} chữ
              </Text>
            </View>
            <View style={[styles.noteInputContainer, Shadows.ghostBorder]}>
              <TextInput
                style={styles.noteInput}
                placeholder="Hôm nay bạn đã trải qua điều gì đặc biệt?"
                placeholderTextColor={Colors.light.outlineVariant}
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Image Picker */}
          <ImagePickerSection
            imageUri={imageUri}
            onImageSelected={setImageUri}
            onImageRemoved={() => setImageUri(null)}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!mood || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!mood || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Lưu trạng thái</Text>
              </>
            )}
          </TouchableOpacity>

          {/* History Section */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Lịch sử gần đây</Text>
            {isLoadingHistory ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.md }} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistoryState}>
                <Text style={styles.emptyHistoryText}>Chưa có ghi nhận nào.</Text>
              </View>
            ) : (
              history.map((item) => (
                <View key={item.id} style={[styles.historyCard, Shadows.ghostBorder]}>
                  <View style={styles.historyHeaderRow}>
                    <View style={styles.historyMoodBadge}>
                      <Text style={styles.historyEmoji}>{getMoodEmoji(item.mood)}</Text>
                    </View>
                    <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  {(item.note || item.image_url) && (
                    <View style={styles.historyContent}>
                      {item.note && <Text style={styles.historyNote}>{item.note}</Text>}
                      {item.image_url && (
                        <Image 
                          source={{ uri: item.image_url }} 
                          style={styles.historyImage} 
                        />
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  // Intro Card
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107, 56, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  introTextBox: {
    flex: 1,
  },
  introTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginBottom: 2,
  },
  introSub: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    lineHeight: 18,
  },
  // Note
  noteSection: {
    marginBottom: Spacing.xl,
  },
  noteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noteLabel: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  wordCount: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  wordCountOver: {
    color: '#EF4444',
  },
  noteInputContainer: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  noteInput: {
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurface,
    minHeight: 100,
    lineHeight: 22,
  },
  // Submit
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.ambient,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
  },
  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.sm,
  },
  successSub: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
  },
  // History Section
  historySection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 195, 215, 0.3)', // outline_variant with opacity
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  emptyHistoryState: {
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
  },
  historyCard: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyMoodBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmoji: {
    fontSize: 20,
  },
  historyDate: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  historyContent: {
    marginTop: Spacing.xs,
  },
  historyNote: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    color: Colors.light.onSurface,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  historyImage: {
    width: '100%',
    height: 220,             // Chiều cao cố định lý tưởng
    resizeMode: 'cover',     // Cắt cúp mượt mà để lấp đầy toàn bộ khu vực, tránh dư thừa khoảng trắng
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.surfaceContainerHigh,
  },
});
