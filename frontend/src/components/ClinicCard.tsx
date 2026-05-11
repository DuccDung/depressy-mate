import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BorderRadius, Spacing } from '../../constants/theme';
import { API_ORIGIN } from '../services/api';

interface ClinicCardProps {
  id: string;
  name: string;
  address: string;
  working_hours: string;
  price_reference: string;
  url_avatar: string;
  onPressContact: () => void;
}

const DEFAULT_CLINIC_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80';

export default function ClinicCard({
  name,
  address,
  working_hours,
  price_reference,
  url_avatar,
  onPressContact,
}: ClinicCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = useMemo<ImageSourcePropType>(() => {
    if (imageFailed) return { uri: DEFAULT_CLINIC_IMAGE };
    return { uri: resolveImageUrl(url_avatar, DEFAULT_CLINIC_IMAGE) };
  }, [imageFailed, url_avatar]);

  return (
    <View style={styles.cardContainer}>
      <ImageBackground
        source={imageSource}
        imageStyle={styles.image}
        style={styles.headerContainer}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      >
        <View style={styles.imageShade} />
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Ionicons name="business" size={13} color="#1D6B63" />
            <Text style={styles.badgeText}>Cơ sở hỗ trợ</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.nameText} numberOfLines={2}>{name || 'Phòng khám tâm lý'}</Text>
          <Text style={styles.addressPreview} numberOfLines={1}>{address || 'Địa chỉ đang cập nhật'}</Text>
        </View>
      </ImageBackground>

      <View style={styles.contentContainer}>
        <InfoRow icon="map-pin" label="Địa chỉ" value={address || 'Đang cập nhật'} />
        <View style={styles.infoGrid}>
          <InfoPill icon="clock" label="Giờ làm việc" value={working_hours || 'Liên hệ'} />
          <InfoPill icon="tag" label="Chi phí" value={price_reference || 'Tư vấn'} />
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={onPressContact} activeOpacity={0.84}>
          <Feather name="phone-call" size={16} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Liên hệ ngay</Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
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

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoPill}>
      <Feather name={icon} size={15} color="#7350A6" />
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={1}>{value}</Text>
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
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 26,
    elevation: 3,
  },
  headerContainer: {
    height: 166,
    justifyContent: 'space-between',
    backgroundColor: '#D9E8E3',
  },
  image: {
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  headerTop: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(221,244,240,0.94)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#1D6B63',
    marginLeft: 5,
  },
  headerBottom: {
    padding: Spacing.md,
  },
  nameText: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 25,
  },
  addressPreview: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#F1FFFC',
    marginTop: 4,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  infoGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoPill: {
    flex: 1,
    minHeight: 76,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F5F0FF',
    padding: Spacing.sm,
  },
  infoPillLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '900',
    color: '#7350A6',
    marginTop: 7,
  },
  infoPillValue: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#2E2638',
    marginTop: 2,
  },
  contactButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1D6B63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  contactButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
});
