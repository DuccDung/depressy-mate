import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { ChatUser, chatService } from '../../services/chatService';
import { UserAvatar } from '../../components/socials/UserAvatar';

export const CreateGroupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, ChatUser>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedList = useMemo(() => Object.values(selectedUsers), [selectedUsers]);
  const canCreate = groupName.trim().length > 0 && selectedList.length >= 2 && !isCreating;

  useEffect(() => {
    const timer = setTimeout(async () => {
      const keyword = query.trim();
      if (!keyword) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const users = await chatService.searchUsers(keyword);
        setResults(users);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const toggleUser = (user: ChatUser) => {
    setSelectedUsers((previous) => {
      const next = { ...previous };
      if (next[user.user_id]) {
        delete next[user.user_id];
      } else {
        next[user.user_id] = user;
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    setIsCreating(true);
    try {
      const result = await chatService.createGroupConversation(
        groupName.trim(),
        selectedList.map((user) => user.user_id)
      );

      navigation.replace('ChatDetail', {
        conversationId: result.id,
        title: result.conversation.display_name,
      });
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Chưa tạo được nhóm', 'Kiểm tra tên nhóm và thành viên rồi thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUser = ({ item }: { item: ChatUser }) => {
    const selected = !!selectedUsers[item.user_id];

    return (
      <TouchableOpacity style={styles.userRow} onPress={() => toggleUser(item)}>
        <UserAvatar
          userId={item.user_id}
          size={44}
          prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
          containerStyle={styles.avatarContainer}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
          {selected && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo nhóm</Text>
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          {isCreating ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.groupNameBox}>
          <Ionicons name="people" size={22} color={Colors.light.primary} />
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Tên nhóm"
            placeholderTextColor={Colors.light.onSurfaceVariant}
            maxLength={255}
          />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.light.icon} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm thành viên"
            placeholderTextColor={Colors.light.onSurfaceVariant}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.light.icon} />
            </TouchableOpacity>
          )}
        </View>

        {selectedList.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionLabel}>Đã chọn {selectedList.length}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedScroller}>
              {selectedList.map((item) => (
                <TouchableOpacity key={item.user_id} style={styles.selectedChip} onPress={() => toggleUser(item)}>
                  <UserAvatar
                    userId={item.user_id}
                    size={28}
                    prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
                  />
                  <Text style={styles.selectedChipText} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Ionicons name="close" size={14} color={Colors.light.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.light.secondary} />
          <Text style={styles.hintText}>Chọn ít nhất 2 thành viên khác để tạo nhóm.</Text>
        </View>

        {isSearching ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.user_id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <Text style={styles.emptyText}>Không tìm thấy người dùng phù hợp.</Text>
              ) : (
                <Text style={styles.emptyText}>Nhập tên hoặc email để tìm thành viên.</Text>
              )
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  createButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  groupNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surfaceContainer,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  groupNameInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: 'Manrope',
    fontSize: 17,
    color: Colors.light.onSurface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
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
    fontSize: 16,
    color: Colors.light.onSurface,
  },
  selectedSection: {
    marginTop: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  selectedScroller: {
    gap: Spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 190,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2EDFF',
    paddingLeft: 6,
    paddingRight: Spacing.sm,
    gap: 6,
  },
  selectedChipText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.onSurface,
    maxWidth: 110,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#EAF7F5',
  },
  hintText: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.secondary,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  userEmail: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.light.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
