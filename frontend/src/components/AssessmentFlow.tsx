import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import assessmentsData from '../../clinical_scales_seed.json';
import AssessmentCard from './AssessmentCard';
import QuestionnaireModal from './QuestionnaireModal';
import ResultGauge from './ResultGauge';
import AssessmentAdviceModal from './AssessmentAdviceModal';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { Spacing } from '../../constants/theme';
import { AssessmentAdvice, getAssessmentAdvice } from '../utils/assessmentAdvice';

interface AssessmentFlowProps {
  onClose: () => void;
}

const palette = {
  canvas: '#FAF8F2',
  text: '#111817',
  muted: '#65736F',
  primary: '#1D6B63',
  primarySoft: '#E3F1EE',
  border: 'rgba(20,78,73,0.14)',
};

export default function AssessmentFlow({ onClose }: AssessmentFlowProps) {
  const { user, updateUser } = useAuth();
  const userAge = Number.isInteger(user?.age) ? user?.age ?? null : null;
  const assessments = assessmentsData.filter((item: any) => item?.questions && isAssessmentForAge(item.target_age, userAge));

  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [pendingAssessment, setPendingAssessment] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(false);
  const [ageInput, setAgeInput] = useState('');
  const [ageSaving, setAgeSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'tests' | 'single' | 'history'>('tests');
  const [singleResult, setSingleResult] = useState<any>(null);
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adviceVisible, setAdviceVisible] = useState(false);
  const [currentAdvice, setCurrentAdvice] = useState<AssessmentAdvice | null>(null);

  const handleFetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assessments/history');
      if (res.data.data && res.data.data.length > 0) {
        const history = res.data.data;
        const latestPerTest: any[] = [];
        const seen = new Set();
        
        for (const r of history) {
            if (!seen.has(r.assessment_code)) {
                seen.add(r.assessment_code);
                latestPerTest.push(r);
            }
        }
        
        setHistoryResults(latestPerTest);
        setViewMode('history');
      } else {
        Alert.alert('Thông báo', 'Bạn chưa có kết quả bài test nào.');
      }
    } catch (e) {
      console.log('Error fetching history:', e);
      Alert.alert('Lỗi', 'Không thể lấy lịch sử bài test');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssessment = (asm: any) => {
    if (!userAge) {
      setPendingAssessment(asm);
      setAgeInput('');
      setAgeModalVisible(true);
      return;
    }

    setSelectedAssessment(asm);
    setModalVisible(true);
  };

  const handleSaveAge = async () => {
    const nextAge = Number(ageInput);
    if (!Number.isInteger(nextAge) || nextAge < 6 || nextAge > 120) {
      Alert.alert('Tuổi chưa hợp lệ', 'Vui lòng nhập tuổi từ 6 đến 120.');
      return;
    }

    setAgeSaving(true);
    try {
      const nextProfile = await profileService.updateMe({
        fullName: user?.fullName || 'Người dùng',
        avatarUrl: user?.avatarUrl,
        bio: user?.bio,
        age: nextAge,
      });
      await updateUser({ age: nextProfile.age, updatedAt: nextProfile.updatedAt });
      setAgeModalVisible(false);

      if (pendingAssessment && isAssessmentForAge(pendingAssessment.target_age, nextAge)) {
        setSelectedAssessment(pendingAssessment);
        setModalVisible(true);
      } else if (pendingAssessment) {
        Alert.alert('Bài test không phù hợp', 'Bài test này không nằm trong nhóm tuổi của bạn.');
      }
      setPendingAssessment(null);
    } catch (error: any) {
      Alert.alert('Không thể lưu tuổi', error.response?.data?.error || 'Vui lòng thử lại sau.');
    } finally {
      setAgeSaving(false);
    }
  };

  const handleSubmitAssessment = async (answers: any[]) => {
    setModalVisible(false);
    setSubmitting(true);
    try {
      const payload = {
        assessment_code: selectedAssessment.assessment_code,
        user_answers: answers,
      };
      
      const res = await api.post('/assessments/calculate', payload);
      const result = res.data.data;
      setSingleResult(result);
      setViewMode('single');
      setCurrentAdvice(getAssessmentAdvice(result));
      setAdviceVisible(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Có lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || submitting) {
    return <ActivityIndicator size="large" color={palette.primary} style={styles.loader} />;
  }

  return (
    <View style={styles.fullFlex}>
      {viewMode === 'history' ? (
        <View style={styles.fullFlex}>
          <View style={styles.subHeaderRow}>
             <Text style={styles.sectionHeading}>Kết quả các bài đã làm</Text>
             <TouchableOpacity style={styles.headerAction} onPress={() => setViewMode('tests')} activeOpacity={0.82}>
                <Text style={styles.seeAllText}>Trở về</Text>
             </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {historyResults.map((result, index) => (
              <View key={index} style={{ marginBottom: Spacing.md }}>
                <ResultGauge result={result} />
              </View>
            ))}
            <View style={{height: Spacing.xl}} />
          </ScrollView>
        </View>
      ) : viewMode === 'single' ? (
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <ResultGauge result={singleResult} onClose={() => setViewMode('tests')} />
        </ScrollView>
      ) : (
        <View style={styles.fullFlex}>
          <View style={styles.subHeaderRow}>
             <Text style={styles.sectionHeading}>Bộ bài kiểm tra tâm lý</Text>
             <View style={{ flexDirection: 'row', gap: 10 }}>
               <TouchableOpacity style={styles.headerAction} onPress={handleFetchHistory} activeOpacity={0.82}>
                  <Text style={styles.seeAllText}>Lịch sử</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.headerAction} onPress={onClose} activeOpacity={0.82}>
                  <Text style={styles.seeAllText}>Đóng</Text>
               </TouchableOpacity>
             </View>
          </View>
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {assessments.map((asm: any) => (
              <AssessmentCard 
                key={asm.assessment_code} 
                assessment={asm} 
                onPress={() => handleOpenAssessment(asm)} 
              />
            ))}
            <View style={{height: Spacing.xl}} />
          </ScrollView>
        </View>
      )}

      {/* MODAL LÀM BÀI */}
      <QuestionnaireModal
        visible={modalVisible}
        assessment={selectedAssessment}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitAssessment}
      />

      <Modal
        visible={ageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!ageSaving) {
            setAgeModalVisible(false);
            setPendingAssessment(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.ageModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.ageModalCard}>
            <Text style={styles.ageModalTitle}>Nhập tuổi của bạn</Text>
            <Text style={styles.ageModalText}>
              Hệ thống cần tuổi để hiển thị bài test tâm lý phù hợp với nhóm tuổi của bạn.
            </Text>
            <TextInput
              style={styles.ageInput}
              value={ageInput}
              onChangeText={(value) => setAgeInput(value.replace(/\D/g, ''))}
              placeholder="Ví dụ: 18"
              placeholderTextColor="#8B9693"
              keyboardType="number-pad"
              maxLength={3}
              editable={!ageSaving}
            />
            <View style={styles.ageActions}>
              <TouchableOpacity
                style={[styles.ageButton, styles.ageCancelButton]}
                onPress={() => {
                  setAgeModalVisible(false);
                  setPendingAssessment(null);
                }}
                disabled={ageSaving}
              >
                <Text style={styles.ageCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ageButton, styles.ageSaveButton]}
                onPress={handleSaveAge}
                disabled={ageSaving}
              >
                {ageSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.ageSaveText}>Lưu tuổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AssessmentAdviceModal
        visible={adviceVisible}
        advice={currentAdvice}
        onClose={() => setAdviceVisible(false)}
      />
    </View>
  );
}

function isAssessmentForAge(targetAge: string | undefined, age: number | null) {
  if (!age || !targetAge) return true;

  const rangeMatch = targetAge.match(/(\d+)\s*-\s*(\d+)/);
  if (!rangeMatch) return true;

  const minAge = Number(rangeMatch[1]);
  const maxAge = Number(rangeMatch[2]);
  return age >= minAge && age <= maxAge;
}

const styles = StyleSheet.create({
  fullFlex: { flex: 1, backgroundColor: palette.canvas },
  scrollArea: { flex: 1 },
  loader: {
    marginTop: 50,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    flex: 1,
    fontSize: 21,
    fontFamily: 'Manrope',
    fontWeight: '900',
    color: palette.text,
    letterSpacing: 0,
    marginRight: Spacing.sm,
  },
  headerAction: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  seeAllText: {
    color: palette.primary,
    fontWeight: '900',
    fontFamily: 'Manrope',
    fontSize: 13,
  },
  ageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,23,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  ageModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  ageModalTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    color: palette.text,
  },
  ageModalText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: palette.muted,
    marginTop: 8,
  },
  ageInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAF8',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  ageActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ageButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageCancelButton: {
    backgroundColor: palette.primarySoft,
  },
  ageSaveButton: {
    backgroundColor: palette.primary,
  },
  ageCancelText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '900',
    color: palette.primary,
  },
  ageSaveText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
});
