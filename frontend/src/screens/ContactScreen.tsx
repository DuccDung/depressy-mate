import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { Spacing, BorderRadius } from '../../constants/theme';
import DoctorCard from '../components/DoctorCard';
import ClinicCard from '../components/ClinicCard';
import SearchFilterBar from '../components/SearchFilterBar';
import Pagination from '../components/Pagination';

type TabType = 'doctor' | 'clinic';
type DirectoryItem = Doctor | Clinic;

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [doctorsRes, clinicsRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/clinics'),
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

  const filteredData = useMemo<DirectoryItem[]>(() => {
    const lowerQuery = searchQuery.trim().toLowerCase();

    if (activeTab === 'doctor') {
      return doctors.filter((doctor) => (
        doctor.name.toLowerCase().includes(lowerQuery)
        || (doctor.specialty || '').toLowerCase().includes(lowerQuery)
        || (doctor.degree || '').toLowerCase().includes(lowerQuery)
      ));
    }

    return clinics.filter((clinic) => (
      clinic.name.toLowerCase().includes(lowerQuery)
      || (clinic.address || '').toLowerCase().includes(lowerQuery)
    ));
  }, [activeTab, searchQuery, doctors, clinics]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const renderHeader = () => {
    const resultLabel = activeTab === 'doctor' ? 'bác sĩ' : 'phòng khám';

    return (
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>Depressy Mate Care</Text>
            <Text style={styles.title}>Liên hệ chuyên gia</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Tìm bác sĩ, phòng khám và điểm hỗ trợ phù hợp khi bạn cần được lắng nghe chuyên nghiệp.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#1D6B63" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Ưu tiên sự an toàn của bạn</Text>
            <Text style={styles.heroText}>
              Nếu bạn đang trong tình huống khẩn cấp, hãy liên hệ người thân hoặc cơ sở y tế gần nhất ngay.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <SupportStat icon="medical-outline" label="Bác sĩ" value={doctors.length} tone="#7350A6" background="#EEE4FF" />
          <SupportStat icon="business-outline" label="Phòng khám" value={clinics.length} tone="#1D6B63" background="#DDF4F0" />
          <SupportStat icon="sparkles-outline" label="Gợi ý" value="24/7" tone="#D77948" background="#FFEADB" />
        </View>

        <View style={styles.tabs}>
          <TabButton
            label="Bác sĩ"
            count={doctors.length}
            icon="user-check"
            active={activeTab === 'doctor'}
            onPress={() => setActiveTab('doctor')}
          />
          <TabButton
            label="Phòng khám"
            count={clinics.length}
            icon="map-pin"
            active={activeTab === 'clinic'}
            onPress={() => setActiveTab('clinic')}
          />
        </View>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterPress={() => Alert.alert('Bộ lọc', 'Tính năng lọc nâng cao đang được phát triển.')}
          placeholder={activeTab === 'doctor' ? 'Tìm bác sĩ, chuyên khoa...' : 'Tìm phòng khám, địa chỉ...'}
        />

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'doctor' ? 'Chuyên gia phù hợp' : 'Cơ sở hỗ trợ'}
          </Text>
          <Text style={styles.resultCount}>{filteredData.length} {resultLabel}</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: DirectoryItem }) => {
    if (activeTab === 'doctor') {
      const doctor = item as Doctor;
      return <DoctorCard {...doctor} onPressContact={() => handleContact(doctor.name)} />;
    }

    const clinic = item as Clinic;
    return <ClinicCard {...clinic} onPressContact={() => handleContact(clinic.name)} />;
  };

  const renderFooter = () => {
    if (loading) return null;
    if (filteredData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="search" size={24} color="#1D6B63" />
          </View>
          <Text style={styles.emptyTitle}>Chưa tìm thấy kết quả phù hợp</Text>
          <Text style={styles.emptyText}>Thử đổi từ khóa hoặc chuyển sang danh sách khác.</Text>
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
      {loading && !doctors.length && !clinics.length ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1D6B63" />
          <Text style={styles.loadingText}>Đang tải danh bạ hỗ trợ...</Text>
        </View>
      ) : (
        <FlatList
          data={paginatedData}
          keyExtractor={(item) => String(item.id)}
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

function SupportStat({
  icon,
  label,
  value,
  tone,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tone: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  label,
  count,
  icon,
  active,
  onPress,
}: {
  label: string;
  count: number;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Feather name={icon} size={17} color={active ? '#FFFFFF' : '#55736E'} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
        <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#66726F',
    marginTop: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 112,
    paddingTop: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#7350A6',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '900',
    color: '#144E49',
    marginTop: 3,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1D6B63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D6B63',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroCard: {
    minHeight: 108,
    borderRadius: BorderRadius.md,
    backgroundColor: '#1D6B63',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#CFEDE8',
    lineHeight: 18,
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FFFFFF',
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#12201D',
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#687572',
    marginTop: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: '#1D6B63',
    borderColor: '#1D6B63',
  },
  tabText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '800',
    color: '#55736E',
    marginHorizontal: 7,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF3F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  tabBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#55736E',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    color: '#144E49',
  },
  resultCount: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#7350A6',
    backgroundColor: '#EEE4FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    color: '#144E49',
  },
  emptyText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    marginTop: 4,
    textAlign: 'center',
  },
});
