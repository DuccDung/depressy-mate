import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import DoctorCard from '../components/DoctorCard';
import ClinicCard from '../components/ClinicCard';
import SearchFilterBar from '../components/SearchFilterBar';
import Pagination from '../components/Pagination';

type TabType = 'doctor' | 'clinic';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  degree: string;
  experience: string;
  price_reference: string;
  url_avatar: string;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  working_hours: string;
  price_reference: string;
  url_avatar: string;
}

const PAGE_SIZE = 6;

export default function ContactScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('doctor');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [doctorsRes, clinicsRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/clinics')
      ]);
      setDoctors(doctorsRes.data);
      setClinics(clinicsRes.data);
    } catch (error) {
      console.error('Error fetching contact data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu liên hệ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (name: string) => {
    Alert.alert('Liên hệ', `Bạn muốn liên hệ với: ${name}`);
  };

  // Filter and Pagination Logic
  const filteredData = useMemo(() => {
    let result = [];
    const lowerQuery = searchQuery.toLowerCase();

    if (activeTab === 'doctor') {
      result = doctors.filter(
        d => d.name.toLowerCase().includes(lowerQuery) || 
             (d.specialty && d.specialty.toLowerCase().includes(lowerQuery))
      );
    } else {
      result = clinics.filter(
        c => c.name.toLowerCase().includes(lowerQuery) || 
             (c.address && c.address.toLowerCase().includes(lowerQuery))
      );
    }
    return result;
  }, [activeTab, searchQuery, doctors, clinics]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const renderTabHeader = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'doctor' && styles.tabButtonActive]}
        onPress={() => setActiveTab('doctor')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, activeTab === 'doctor' && styles.tabTextActive]}>Bác sĩ</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'clinic' && styles.tabButtonActive]}
        onPress={() => setActiveTab('clinic')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, activeTab === 'clinic' && styles.tabTextActive]}>Phòng khám</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Hỗ trợ & Liên hệ</Text>
      <Text style={styles.subtitle}>Tìm chuyên gia và cơ sở y tế phù hợp với bạn</Text>
      
      {renderTabHeader()}

      <SearchFilterBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => Alert.alert('Bộ lọc', 'Tính năng lọc nâng cao đang được phát triển')}
        placeholder={activeTab === 'doctor' ? "Tìm bác sĩ, chuyên khoa..." : "Tìm phòng khám, bệnh viện..."}
      />
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'doctor') {
      const doc = item as Doctor;
      return (
        <DoctorCard 
          {...doc} 
          onPressContact={() => handleContact(doc.name)}
        />
      );
    } else {
      const clinic = item as Clinic;
      return (
        <ClinicCard 
          {...clinic} 
          onPressContact={() => handleContact(clinic.name)}
        />
      );
    }
  };

  const renderFooter = () => {
    if (loading) return null;
    if (filteredData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy kết quả phù hợp</Text>
        </View>
      );
    }
    return (
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {loading && !doctors.length ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={paginatedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold as any,
    color: Colors.light.primary, // Cập nhật màu nhấn cho tiêu đề
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    color: Colors.light.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium as any,
    color: Colors.light.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.light.primary,
    fontWeight: Typography.weights.bold as any,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    color: Colors.light.onSurfaceVariant,
  },
});
