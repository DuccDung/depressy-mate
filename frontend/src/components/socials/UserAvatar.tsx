import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/theme';
import { socialService } from '../../services/socialService';

interface UserAvatarProps {
  userId: string;
  size?: number;
  showName?: boolean;
  nameStyle?: object;
  containerStyle?: object;
  // Truyền sẵn dữ liệu để không cần gọi API
  prefetchData?: {
    avatarUrl?: string | null;
    name?: string | null;
  };
}

// Hàm an toàn để render UI-Avatars
const getSafeAvatarUri = (avatarUrl?: string | null, name?: string | null) => {
  if (avatarUrl && avatarUrl !== 'null' && avatarUrl.trim() !== '') return avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent((name || 'User').trim() || 'User')}&background=random`;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId, 
  size = 36, 
  showName = false,
  nameStyle,
  containerStyle,
  prefetchData
}) => {
  const [data, setData] = useState({
    avatarUrl: prefetchData?.avatarUrl || null,
    name: prefetchData?.name || ''
  });

  useEffect(() => {
    // Nếu có prefetchData rồi thì không gọi API nữa!
    if (prefetchData?.name) return;

    let mounted = true;
    const fetchUser = async () => {
      try {
        const result = await socialService.getUserProfile(userId);
        if (mounted) {
          setData({
            avatarUrl: result.avatar_url,
            name: result.full_name
          });
        }
      } catch (err) {
        console.warn('Cannot fetch profile for user', userId);
      }
    };
    fetchUser();
    
    return () => { mounted = false; };
  }, [userId, prefetchData]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Image 
        source={{ uri: getSafeAvatarUri(data.avatarUrl, data.name) }} 
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E1E1E1' }}
      />
      {showName && !!data.name && (
        <Text style={[styles.name, nameStyle]}>{data.name}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.light.onSurface,
    marginLeft: 8,
  }
});
