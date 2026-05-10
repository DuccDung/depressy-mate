import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { ChatUser, Conversation, ConversationParticipant, chatService } from '../../services/chatService';
import { UserAvatar } from '../../components/socials/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

type ConversationInfoRoute = RouteProp<MainStackParamList, 'ConversationInfo'>;

export const ConversationInfoScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ConversationInfoRoute>();
  const { user } = useAuth();
  const conversationId = route.params.conversationId;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const myParticipant = useMemo(
    () => conversation?.participants.find((participant) => participant.user_id === user?.id),
    [conversation, user?.id]
  );
  const canManage = conversation?.type === 'GROUP' && (myParticipant?.role === 'OWNER' || myParticipant?.role === 'ADMIN');
  const activeMemberIds = useMemo(
    () => new Set(conversation?.participants.map((participant) => participant.user_id) || []),
    [conversation]
  );

  const loadConversation = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getConversation(conversationId);
      setConversation(data);
      setNameDraft(data.name || data.display_name);
    } catch (error) {
      console.error('Failed to load conversation info:', error);
      Alert.alert('Không thể tải thông tin', 'Vui lòng thử lại sau.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, navigation]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const keyword = memberQuery.trim();
      if (!keyword || conversation?.type !== 'GROUP') {
        setMemberResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const users = await chatService.searchUsers(keyword);
        setMemberResults(users.filter((item) => !activeMemberIds.has(item.user_id)));
      } catch (error) {
        console.error('Failed to search members:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeMemberIds, conversation?.type, memberQuery]);

  const handleSaveName = async () => {
    if (!conversation || !canManage) return;
    const nextName = nameDraft.trim();
    if (!nextName || nextName === conversation.name) return;

    setIsSavingName(true);
    try {
      const updated = await chatService.updateGroup(conversation.id, { name: nextName });
      setConversation(updated);
      setNameDraft(updated.name || updated.display_name);
    } catch (error) {
      console.error('Failed to update group:', error);
      Alert.alert('Chưa đổi được tên nhóm', 'Vui lòng thử lại sau.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAddMember = async (member: ChatUser) => {
    if (!conversation || !canManage) return;

    try {
      const updated = await chatService.addMembers(conversation.id, [member.user_id]);
      setConversation(updated);
      setMemberQuery('');
      setMemberResults([]);
    } catch (error) {
      console.error('Failed to add member:', error);
      Alert.alert('Chưa thêm được thành viên', 'Vui lòng thử lại sau.');
    }
  };

  const handleRemoveMember = (member: ConversationParticipant) => {
    if (!conversation || !canManage) return;

    Alert.alert('Xóa thành viên', `Xóa ${member.full_name} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await chatService.removeMember(conversation.id, member.user_id);
            setConversation(updated);
          } catch (error) {
            console.error('Failed to remove member:', error);
            Alert.alert('Chưa xóa được thành viên', 'Vui lòng thử lại sau.');
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    if (!conversation || conversation.type !== 'GROUP') return;

    Alert.alert('Rời nhóm', 'Bạn sẽ không nhận tin nhắn mới từ nhóm này nữa.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.leaveGroup(conversation.id);
            navigation.navigate('MainTabs');
          } catch (error) {
            console.error('Failed to leave group:', error);
            Alert.alert('Chưa rời được nhóm', 'Vui lòng thử lại sau.');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }: { item: ConversationParticipant }) => {
    const isMe = item.user_id === user?.id;
    const canRemove = canManage && !isMe && item.role !== 'OWNER';

    return (
      <View style={styles.memberRow}>
        <UserAvatar
          userId={item.user_id}
          size={42}
          prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
          containerStyle={styles.avatarContainer}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.full_name}{isMe ? ' (Bạn)' : ''}
            </Text>
            {item.role !== 'MEMBER' && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{item.role === 'OWNER' ? 'Chủ nhóm' : 'Quản trị'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberEmail} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
        {canRemove && (
          <TouchableOpacity style={styles.memberAction} onPress={() => handleRemoveMember(item)}>
            <Ionicons name="remove-circle-outline" size={22} color="#D14343" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading || !conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          {conversation.type === 'GROUP' ? (
            conversation.display_avatar_url ? (
              <Image source={{ uri: conversation.display_avatar_url }} style={styles.heroAvatarImage} />
            ) : (
              <View style={styles.heroAvatar}>
                <Ionicons name="people" size={36} color={Colors.light.primary} />
              </View>
            )
          ) : (
            <UserAvatar
              userId={conversation.participants[0]?.user_id || ''}
              size={82}
              prefetchData={{
                avatarUrl: conversation.display_avatar_url || conversation.participants[0]?.avatar_url,
                name: conversation.display_name,
              }}
            />
          )}

          <Text style={styles.heroTitle} numberOfLines={2}>
            {conversation.display_name}
          </Text>
          <Text style={styles.heroSubtitle}>
            {conversation.type === 'GROUP' ? `${conversation.participant_count} thành viên` : 'Tin nhắn riêng tư'}
          </Text>
        </View>

        {conversation.type === 'GROUP' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tên nhóm</Text>
            <View style={styles.editRow}>
              <TextInput
                style={[styles.nameInput, !canManage && styles.nameInputReadonly]}
                value={nameDraft}
                onChangeText={setNameDraft}
                editable={!!canManage}
                maxLength={255}
              />
              {canManage && (
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveName} disabled={isSavingName}>
                  {isSavingName ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save-outline" size={18} color="#FFF" />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {conversation.type === 'GROUP' && canManage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thêm thành viên</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={Colors.light.icon} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={memberQuery}
                onChangeText={setMemberQuery}
                placeholder="Tìm người dùng"
                placeholderTextColor={Colors.light.onSurfaceVariant}
                autoCapitalize="none"
              />
            </View>
            {isSearching ? (
              <ActivityIndicator size="small" color={Colors.light.primary} style={styles.smallLoader} />
            ) : memberResults.length > 0 ? (
              memberResults.map((item) => (
                <TouchableOpacity key={item.user_id} style={styles.addRow} onPress={() => handleAddMember(item)}>
                  <UserAvatar
                    userId={item.user_id}
                    size={34}
                    prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
                    containerStyle={styles.avatarContainer}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.full_name}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.light.primary} />
                </TouchableOpacity>
              ))
            ) : null}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành viên</Text>
          {conversation.participants.map((participant) => (
            <React.Fragment key={participant.user_id}>{renderMember({ item: participant })}</React.Fragment>
          ))}
        </View>

        {conversation.type === 'GROUP' && (
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
            <Ionicons name="exit-outline" size={20} color="#D14343" />
            <Text style={styles.leaveButtonText}>Rời nhóm</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  headerButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F2EDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.light.surfaceContainer,
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.onSurface,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  heroSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.light.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surfaceContainer,
    paddingHorizontal: Spacing.md,
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.light.onSurface,
  },
  nameInputReadonly: {
    color: Colors.light.onSurfaceVariant,
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surfaceContainer,
    paddingHorizontal: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurface,
  },
  smallLoader: {
    marginTop: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  memberEmail: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F2EDFF',
    marginLeft: Spacing.xs,
  },
  roleBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  memberAction: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  leaveButton: {
    marginTop: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FFF1F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  leaveButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#D14343',
  },
});
