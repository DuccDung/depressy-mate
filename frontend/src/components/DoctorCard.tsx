import React, { useMemo, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BorderRadius, Spacing } from '../../constants/theme';
import { API_ORIGIN } from '../services/api';

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  degree: string;
  experience: string;
  price_reference: string;
  url_avatar: string;
  onPressContact: () => void;
}

const DEFAULT_DOCTOR_IMAGE =
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80';

export default function DoctorCard({
  name,
  specialty,
  degree,
  experience,
  price_reference,
  url_avatar,
  onPressContact,
}: DoctorCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = useMemo<ImageSourcePropType>(() => {
    if (imageFailed) return { uri: DEFAULT_DOCTOR_IMAGE };
    return { uri: resolveImageUrl(url_avatar, DEFAULT_DOCTOR_IMAGE) };
  }, [imageFailed, url_avatar]);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Image source={imageSource} style={styles.avatar} onError={() => setImageFailed(true)} />
        <View style={styles.infoCol}>
          <View style={styles.badgeRow}>
            <View style={styles.verifyBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#1D6B63" />
              <Text style={styles.verifyText}>Đã xác minh</Text>
            </View>
          </View>
          <Text style={styles.nameText} numberOfLines={2}>{name || 'Chuyên gia tâm lý'}</Text>
          <Text style={styles.degreeText} numberOfLines={2}>
            {[degree, specialty].filter(Boolean).join(' • ') || 'Tư vấn sức khỏe tinh thần'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <InfoRow icon="briefcase" label="Kinh nghiệm" value={experience || 'Đang cập nhật'} />
        <InfoRow icon="tag" label="Chi phí" value={price_reference || 'Liên hệ để biết thêm'} />
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.quickNote}>
          <Feather name="heart" size={15} color="#7350A6" />
          <Text style={styles.quickNoteText}>Phù hợp để đặt lịch tư vấn</Text>
        </View>
        <TouchableOpacity style={styles.contactButton} onPress={onPressContact} activeOpacity={0.84}>
          <Feather name="phone-call" size={16} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Liên hệ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={15} color="#1D6B63" />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailText} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function resolveImageUrl(url: string | undefined, fallback: string) {
  const value = (url || '').trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 26,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: '#E5ECE9',
  },
  infoCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DDF4F0',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  verifyText: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '900',
    color: '#1D6B63',
    marginLeft: 4,
  },
  nameText: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '900',
    color: '#111817',
    lineHeight: 22,
  },
  degreeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#65736F',
    lineHeight: 17,
    marginTop: 3,
  },
  detailsContainer: {
    backgroundColor: '#F5F8F6',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#144E49',
  },
  detailText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#5F6E6A',
    lineHeight: 17,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  quickNote: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickNoteText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#695977',
    marginLeft: 6,
  },
  contactButton: {
    minWidth: 112,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1D6B63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  contactButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginLeft: 7,
  },
});
