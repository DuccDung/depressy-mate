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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../../constants/theme';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  audio_url: string | null;
  created_at: string;
}

const GUIDED_PROMPTS = [
  { id: 'gratitude', badge: 'Lòng biết ơn', question: 'Ba điều bạn cảm thấy biết ơn hôm nay?', time: '5 phút', bgColor: '#F0E7FF', color: '#6B46C1' },
  { id: 'joy', badge: 'Niềm vui', question: 'Điều gì làm bạn mỉm cười gần đây?', time: '3 phút', bgColor: '#D1FAE5', color: '#065F46' },
  { id: 'compassion', badge: 'Tự trắc ẩn', question: 'Một khoảnh khắc bạn cảm thấy tự hào về bản thân?', time: '5 phút', bgColor: '#F3E8FF', color: '#553C9A' },
  { id: 'overthinking', badge: 'Giảm lo âu', question: 'Điều gì đang làm bạn lo lắng nhất hiện tại?', time: '10 phút', bgColor: '#FEF3C7', color: '#D97706' },
  { id: 'future', badge: 'Hướng tới tương lai', question: 'Bạn hy vọng điều gì sẽ đến vào ngày mai?', time: '5 phút', bgColor: '#DBEAFE', color: '#2563EB' },
  { id: 'healing', badge: 'Chữa lành', question: 'Bạn đã chọn cách tha thứ cho mình thế nào ngày hôm nay?', time: '7 phút', bgColor: '#FFE4E6', color: '#E11D48' },
];

const PromptCard = ({ prompt, onPress }: { prompt: any, onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
    <View style={[styles.promptCard, { backgroundColor: prompt.bgColor }]}>
      <View>
        <Text style={[styles.promptBadge, { color: prompt.color }]}>{prompt.badge}</Text>
        <Text style={styles.promptQuestion}>{prompt.question}</Text>
        <View style={styles.promptTime}>
          <Ionicons name="time-outline" size={14} color={prompt.color} />
          <Text style={[styles.promptTimeText, { color: prompt.color }]}>{prompt.time}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const JournalAudioPlayer = ({ uri }: { uri: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const togglePlayback = async () => {
    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    } else {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        setSound(newSound);
        setIsPlaying(true);
        await newSound.playAsync();
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (err) {
        console.log('Error playing audio in list', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  return (
    <View style={styles.itemAudioHint}>
      <TouchableOpacity onPress={togglePlayback} style={styles.itemAudioBtnSmall}>
         <Ionicons name={isPlaying ? "pause" : "play"} size={14} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.itemAudioTextSmall}>Nghe ghi âm đính kèm</Text>
    </View>
  );
};

interface Props {
  onClose: () => void;
}

export default function JournalScreen({ onClose }: Props) {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New entry state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const [isViewingAllPrompts, setIsViewingAllPrompts] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6;

  const handlePromptPress = (prompt: any) => {
    setTitle(prompt.question);
    setIsWriting(true);
    setIsViewingAllPrompts(false);
  };

  useEffect(() => {
    fetchJournals(1);
    return () => {
      // Cleanup sound
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const fetchJournals = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * limit;
      const res = await api.get(`/journals?limit=${limit}&offset=${offset}`);
      setJournals(res.data.journals);
      setTotalPages(Math.ceil(res.data.total / limit) || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        Alert.alert('Cấp quyền', 'Vui lòng cấp quyền micro để ghi âm.');
      }
    } catch (err) {
      console.error('Không thể ghi âm', err);
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    setAudioUri(uri);
  };

  const playAudio = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
      setIsPlaying(true);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Lỗi phát âm thanh', err);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !audioUri) {
      Alert.alert('Chưa có nội dung', 'Vui lòng viết hoặc ghi âm nhật ký của bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Trong môi trường thực tế, nếu có đoạn ghi âm, bạn sẽ cần một API xử lý upload file audio lên Supabase Storage tương tự upload image checkin.
      // Dành cho bản MVP, ta chuyển thẳng audioUri dưới dạng chuỗi local/mock. 
      // Nhưng để xịn hơn, chúng ta nên gửi audio file đi qua dạng form data nếu backend hỗ trợ. Do bài toán hiện tại chưa có API upload audio riêng, ở đây ta minh hoạ việc lưu text.
      await api.post('/journals', {
        title: title.trim() || 'Nhật ký không tên',
        content: content.trim(),
        audioUrl: audioUri, // Mock audio url directly to db for now
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setAudioUri(null);
      setIsWriting(false);
      fetchJournals(1);
    } catch (err) {
      console.error('Lỗi lưu nhật ký:', err);
      Alert.alert('Lỗi', 'Không thể lưu nhật ký của bạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  if (selectedJournal) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedJournal(null)} style={styles.iconButton}>
               <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chi tiết nhật ký</Text>
            <View style={{width: 40}} />
         </View>
         <ScrollView style={styles.writeContainer}>
            <Text style={styles.detailDate}>{formatDate(selectedJournal.created_at)}</Text>
            <Text style={styles.titleInput}>{selectedJournal.title}</Text>
            {selectedJournal.content ? (
               <Text style={styles.detailContent}>{selectedJournal.content}</Text>
            ) : null}
            {selectedJournal.audio_url ? (
               <View style={[styles.audioSection, { marginTop: Spacing.xl, borderRadius: BorderRadius.md }]}>
                  <JournalAudioPlayer uri={selectedJournal.audio_url} />
               </View>
            ) : null}
            <View style={{ height: Spacing.xxl * 2 }} />
         </ScrollView>
      </SafeAreaView>
    );
  }

  if (isViewingAllPrompts) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => setIsViewingAllPrompts(false)} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Tất cả gợi ý</Text>
           <View style={{width: 40}} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={{height: Spacing.lg}} />
          <View style={styles.promptCardWrapper}>
            {GUIDED_PROMPTS.map((prompt) => (
               <PromptCard key={prompt.id} prompt={prompt} onPress={() => handlePromptPress(prompt)} />
            ))}
          </View>
          <View style={{height: Spacing.xxl * 2}} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isWriting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsWriting(false)} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={Colors.light.onSurface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Viết nhật ký</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={styles.saveButton}>
              {isSubmitting ? (
                 <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <Text style={styles.saveText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.writeContainer} showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.titleInput}
              placeholder="Chủ đề hôm nay..."
              placeholderTextColor={Colors.light.outlineVariant}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.contentInput}
              placeholder="Bạn đang nghĩ gì? Hãy viết ra đây nhé..."
              placeholderTextColor={Colors.light.outlineVariant}
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Audio Recording Section Bottom */}
          <View style={styles.audioSection}>
            {audioUri ? (
              <View style={styles.audioPlayer}>
                <TouchableOpacity onPress={isPlaying ? stopAudio : () => playAudio(audioUri)} style={styles.audioBtn}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.audioText}>Âm thanh đã ghi</Text>
                <TouchableOpacity onPress={() => setAudioUri(null)} style={styles.deleteAudio}>
                    <Ionicons name="trash-outline" size={20} color={Colors.light.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.audioActions}>
                 <Text style={styles.audioPrompt}>Cảm thấy lười viết? Hãy ghi âm:</Text>
                 <TouchableOpacity 
                   style={[styles.recordButton, recording && styles.recordingActive]} 
                   onPress={recording ? stopRecording : startRecording}
                 >
                   <Ionicons name={recording ? "stop" : "mic"} size={24} color="#FFF" />
                   {recording && <Text style={styles.recordingText}>Đang ghi...</Text>}
                 </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật ký mỗi ngày</Text>
        <TouchableOpacity style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>{user?.fullName?.charAt(0) || 'U'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Nhật ký của bạn</Text>
          <Text style={styles.subTitle}>Ghi lại những suy nghĩ và nuôi dưỡng sự chánh niệm.</Text>
        </View>

        {/* Hero Card */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroText}>Bắt đầu bài suy ngẫm của bạn.</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => setIsWriting(true)}>
              <Text style={styles.startBtnText}>Bắt đầu viết</Text>
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Prompts */}
        <View style={styles.promptsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
            {GUIDED_PROMPTS.length > 3 && (
              <TouchableOpacity onPress={() => setIsViewingAllPrompts(true)}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.promptCardWrapper}>
            {GUIDED_PROMPTS.slice(0, 3).map((prompt) => (
               <PromptCard key={prompt.id} prompt={prompt} onPress={() => handlePromptPress(prompt)} />
            ))}
          </View>
        </View>

        {/* Recent */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Nhật ký gần đây</Text>
          
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.light.primary} />
          ) : journals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Chưa có bài nhật ký nào. Hãy viết bài đầu tiên!</Text>
            </View>
          ) : (
            journals.map((item, index) => (
              <Animated.View entering={FadeInDown.delay(index * 100)} key={item.id} style={styles.journalItem}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedJournal(item)}>
                  <View style={styles.journalItemHeader}>
                    <Text style={styles.journalDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <Text style={styles.journalItemTitle}>{item.title}</Text>
                  {item.content && (
                    <Text style={styles.journalItemContent} numberOfLines={2}>
                      {item.content}
                    </Text>
                  )}
                </TouchableOpacity>
                {item.audio_url && (
                   <View style={{ marginTop: Spacing.sm }}>
                     <JournalAudioPlayer uri={item.audio_url} />
                   </View>
                )}
              </Animated.View>
            ))
          )}

          {!isLoading && totalPages > 1 && (
             <View style={styles.paginationContainer}>
               <TouchableOpacity 
                 disabled={currentPage === 1} 
                 style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                 onPress={() => fetchJournals(currentPage - 1)}
               >
                 <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? Colors.light.outlineVariant : Colors.light.primary} />
               </TouchableOpacity>
               
               <Text style={styles.pageText}>
                 Trang {currentPage} / {totalPages}
               </Text>

               <TouchableOpacity 
                 disabled={currentPage === totalPages} 
                 style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                 onPress={() => fetchJournals(currentPage + 1)}
               >
                 <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? Colors.light.outlineVariant : Colors.light.primary} />
               </TouchableOpacity>
             </View>
          )}

        </View>
        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.outlineVariant + '30',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  saveButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: Colors.light.primary,
      borderRadius: BorderRadius.full,
  },
  saveText: {
      color: '#FFF',
      fontFamily: Typography.fontFamily,
      fontWeight: '700',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceContainerLow,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholderAvatar: {
    backgroundColor: Colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  mainTitle: {
    fontSize: 40,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    letterSpacing: -1,
  },
  subTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    color: Colors.light.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  heroCard: {
    backgroundColor: 'rgba(221,214,254, 0.4)', // Secondary container
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
  },
  heroText: {
    fontSize: 24,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: '#564982', // on-secondary-container
    marginBottom: Spacing.lg,
    lineHeight: 32,
  },
  startBtn: {
    backgroundColor: Colors.light.primary,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  startBtnText: {
    color: '#FFF',
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  promptsSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
  },
  viewAllText: {
    color: Colors.light.primary,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    fontSize: 14,
  },
  promptCardWrapper: {
    gap: Spacing.md,
  },
  promptCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promptBadge: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  promptQuestion: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginBottom: Spacing.sm,
  },
  promptTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptTimeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    marginLeft: 4,
  },
  recentSection: {
    marginTop: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.light.onSurfaceVariant,
  },
  journalItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  journalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  journalDate: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  journalItemTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.xs,
  },
  journalItemContent: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    color: Colors.light.onSurfaceVariant,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  audioHint: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
  },
  audioHintText: {
      fontSize: 13,
      fontFamily: Typography.fontFamily,
      color: Colors.light.primary,
      marginLeft: 4,
  },
  // Writing UI
  writeContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  titleInput: {
    fontSize: 28,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.lg,
  },
  contentInput: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    color: Colors.light.onSurface,
    lineHeight: 28,
    minHeight: 200,
  },
  audioSection: {
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: Colors.light.surfaceContainerHigh,
      backgroundColor: Colors.light.surfaceContainerLowest,
  },
  audioActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  audioPrompt: {
      fontSize: 15,
      color: Colors.light.onSurfaceVariant,
      fontFamily: Typography.fontFamily,
  },
  recordButton: {
      backgroundColor: Colors.light.primary,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
  },
  recordingActive: {
      backgroundColor: Colors.light.secondaryFixed,
      width: 'auto',
      paddingHorizontal: Spacing.lg,
  },
  recordingText: {
      color: '#FFF',
      marginLeft: Spacing.sm,
      fontWeight: 'bold',
  },
  audioPlayer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.light.surfaceContainerLow,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
  },
  audioBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.light.primary,
      justifyContent: 'center',
      alignItems: 'center',
  },
  audioText: {
      flex: 1,
      marginLeft: Spacing.md,
      fontFamily: Typography.fontFamily,
      fontWeight: '600',
  },
  deleteAudio: {
      padding: Spacing.xs,
  },
  itemAudioHint: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.light.surfaceContainerLow,
      padding: Spacing.sm,
      borderRadius: BorderRadius.sm,
      alignSelf: 'flex-start',
  },
  itemAudioBtnSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: Colors.light.primary,
      justifyContent: 'center',
      alignItems: 'center',
  },
  itemAudioTextSmall: {
      fontSize: 13,
      fontFamily: Typography.fontFamily,
      color: Colors.light.primary,
      marginLeft: Spacing.sm,
      fontWeight: '600',
  },
  detailDate: {
      fontSize: 14,
      fontFamily: Typography.fontFamily,
      fontWeight: '700',
      color: Colors.light.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
  },
  detailContent: {
      fontSize: 18,
      fontFamily: Typography.fontFamily,
      color: Colors.light.onSurface,
      lineHeight: 28,
  },
  paginationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.xl,
      gap: Spacing.md,
  },
  pageBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.light.surfaceContainerHigh,
      justifyContent: 'center',
      alignItems: 'center',
  },
  pageBtnDisabled: {
      backgroundColor: Colors.light.surfaceContainerLow,
  },
  pageText: {
      fontSize: 14,
      fontFamily: Typography.fontFamily,
      fontWeight: '600',
      color: Colors.light.onSurfaceVariant,
  }
});
