import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';

import { UserAvatar } from '../socials/UserAvatar';

interface HomeHeaderProps {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ userId, userName, avatarUrl }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <View style={styles.welcomeSection}>
      <View style={styles.headerRow}>
        <Text style={styles.greetingTitle}>{getGreeting()}, {userName}</Text>
        <View style={styles.profileAvatarContainer}>
          <UserAvatar 
            userId={userId} 
            size={44} 
            prefetchData={{ avatarUrl, name: userName }} 
          />
        </View>
      </View>
      <Text style={styles.greetingSubtitle}>Hôm nay bạn cảm thấy thế nào?</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  greetingTitle: {
    fontSize: 24,
    fontFamily: 'Manrope',
    fontWeight: '800',
    color: Colors.light.onSurface,
    letterSpacing: -0.5,
    flex: 1,
    marginRight: Spacing.md,
  },
  greetingSubtitle: {
    fontSize: 16,
    fontFamily: 'Manrope',
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
  },
  profileAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.light.surfaceContainerLowest,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderAvatar: {
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
