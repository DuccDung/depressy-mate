import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import assessmentsData from '../../clinical_scales_seed.json';
import AssessmentCard from './AssessmentCard';
import QuestionnaireModal from './QuestionnaireModal';
import ResultGauge from './ResultGauge';
import api from '../services/api';
import { Colors, Spacing } from '../../constants/theme';

interface AssessmentFlowProps {
  onClose: () => void;
}

export default function AssessmentFlow({ onClose }: AssessmentFlowProps) {
  const assessments = assessmentsData.filter((item: any) => item.questions);

  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'tests' | 'single' | 'history'>('tests');
  const [singleResult, setSingleResult] = useState<any>(null);
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setSelectedAssessment(asm);
    setModalVisible(true);
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
      setSingleResult(res.data.data);
      setViewMode('single');
      Alert.alert('Thành công', 'Kết quả bài test đã được lưu');
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Có lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || submitting) {
    return <ActivityIndicator size="large" color={Colors.light.primary} style={{marginTop: 50}} />;
  }

  return (
    <View style={styles.fullFlex}>
      {viewMode === 'history' ? (
        <View style={styles.fullFlex}>
          <View style={styles.subHeaderRow}>
             <Text style={styles.sectionHeading}>Kết quả các bài đã làm</Text>
             <TouchableOpacity onPress={() => setViewMode('tests')}>
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
               <TouchableOpacity onPress={handleFetchHistory}>
                  <Text style={styles.seeAllText}>Lịch sử</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={onClose}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullFlex: { flex: 1 },
  scrollArea: { flex: 1 },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeading: {
    fontSize: 20,
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
    fontSize: 14,
  },
});
