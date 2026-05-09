import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';

interface CommunitySectionProps {
  onSeeAll?: () => void;
}

export const CommunitySection: React.FC<CommunitySectionProps> = ({ onSeeAll }) => {
  const communityItems = [
    { 
      id: 1, 
      name: 'Minh Anh', 
      time: '5p trước', 
      title: 'Cách tôi vượt qua những ngày tệ nhất...', 
      img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80', 
      fav: '1.2k', 
      chat: '245' 
    },
    { 
      id: 2, 
      name: 'Linh Chi', 
      time: '1h trước', 
      title: 'Thử thách chánh niệm 7 ngày', 
      img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80', 
      fav: '850', 
      chat: '112' 
    }
  ];

  return (
    <>
      <View style={styles.communityHeader}>
        <View>
          <Text style={styles.sectionHeading}>Cộng đồng</Text>
          <Text style={styles.communitySubtitle}>Chia sẻ và lan tỏa năng lượng</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reelScroll}>
        {communityItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.reelCard} onPress={() => { }} activeOpacity={0.9}>
            <Image source={{ uri: item.img }} style={styles.reelImg} />
            <View style={styles.reelOverlay}>
              <View style={styles.playIconBox}>
                <Ionicons name="play" size={24} color="#FFF" />
              </View>
              <View style={styles.reelBottomInfo}>
                <View style={styles.reelAuthorRow}>
                  <Image source={{ uri: item.avatar }} style={styles.reelAvatar} />
                  <View>
                    <Text style={styles.reelAuthorName}>{item.name}</Text>
                    <Text style={styles.reelTime}>{item.time}</Text>
                  </View>
                </View>
                <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.reelStatsRow}>
                  <View style={styles.statBox}>
                    <Ionicons name="heart" size={12} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.statText}>{item.fav}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Ionicons name="chatbubble" size={12} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.statText}>{item.chat}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 20,
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  communitySubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope',
    color: Colors.light.onSurfaceVariant,
    marginTop: -8,
  },
  seeAllText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
    fontSize: 14,
  },
  reelScroll: {
    paddingBottom: Spacing.md,
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  reelCard: {
    width: 150,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginRight: Spacing.md,
  },
  reelImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelBottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  reelAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  reelAvatar: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  reelAuthorName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reelTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
  },
  reelTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reelStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: 'bold',
  }
});
