import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { groupApi } from '../../api/groups';
import { useAuth } from '../../auth/AuthContext';
import { StudyGroup } from '../../api/types';
import { MainTabParamList, GroupsStackParamList } from '../../navigation/types';
import api from '../../api/client';
import DirectMessagesScreen from './DirectMessagesScreen';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Groups'>,
  NativeStackNavigationProp<GroupsStackParamList>
>;

interface ChatPreview {
  group: StudyGroup;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: string;
    isOwn: boolean;
  };
  unreadCount: number;
}

type MessagesRoute = RouteProp<MainTabParamList, 'Messages'>;

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MessagesRoute>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'direct'>('groups');
  const [groupsTabFilter, setGroupsTabFilter] = useState<'all' | 'unread'>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  // If navigating with a conversationId, switch to direct tab and select conversation
  useEffect(() => {
    if (route.params?.conversationId) {
      setActiveTab('direct');
      setSelectedConversationId(route.params.conversationId);
    }
  }, [route.params?.conversationId]);

  const {
    data: myGroups = [],
    isLoading,
    isRefetching,
    refetch,
    isError: groupsError,
  } = useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: groupApi.myGroups,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Fetch chat previews for each group
  const {
    data: chatPreviews = [],
    isLoading: loadingPreviews,
  } = useQuery({
    queryKey: ['messages', 'previews', myGroups.map(g => g.id)],
    queryFn: async () => {
      const previews: ChatPreview[] = await Promise.all(
        myGroups.map(async (group) => {
          try {
            const { data: preview } = await api.get(`/groups/${group.id}/chat-preview`);
            return {
              group,
              lastMessage: preview.lastMessage ? {
                content: preview.lastMessage.content,
                senderName: preview.lastMessage.sender?.fullName || preview.lastMessage.sender?.username || 'Unknown',
                timestamp: preview.lastMessage.createdAt,
                isOwn: preview.lastMessage.sender?.id === user?.id,
              } : undefined,
              unreadCount: preview.unreadCount || 0,
            };
          } catch {
            return { group, unreadCount: 0 };
          }
        })
      );
      
      // Sort by last message timestamp (most recent first)
      previews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });
      
      return previews;
    },
    enabled: myGroups.length > 0,
  });

  const filteredChats = useMemo(() => {
    let filtered = [...chatPreviews];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat =>
        chat.group.name.toLowerCase().includes(query) ||
        chat.group.course?.name?.toLowerCase().includes(query)
      );
    }
    
    if (groupsTabFilter === 'unread') {
      filtered = filtered.filter(chat => chat.unreadCount > 0);
    }
    
    return filtered;
  }, [chatPreviews, searchQuery, activeTab]);

  const totalUnread = useMemo(
    () => chatPreviews.reduce((sum, chat) => sum + chat.unreadCount, 0),
    [chatPreviews]
  );

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, []);

  const truncateMessage = useCallback((content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  const handleChatPress = useCallback((groupId: number, groupName: string) => {
    navigation.navigate('Groups', {
      screen: 'GroupChat',
      params: { groupId, groupName },
    } as any);
  }, [navigation]);

  const renderChatItem = useCallback(({ item: chat }: { item: ChatPreview }) => {
    const hasUnread = chat.unreadCount > 0;
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatCard,
          hasUnread && styles.chatCardUnread,
          pressed && styles.chatCardPressed,
        ]}
        onPress={() => handleChatPress(chat.group.id, chat.group.name)}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {chat.group.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        {/* Chat Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
              {chat.group.name}
            </Text>
            {chat.lastMessage && (
              <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
                {formatTime(chat.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          
          {chat.lastMessage ? (
            <View style={styles.lastMessageRow}>
              {chat.lastMessage.isOwn && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={hasUnread ? colors.textMuted : colors.primary}
                  style={styles.readIcon}
                />
              )}
              <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                {!chat.lastMessage.isOwn && (
                  <Text style={styles.senderName}>{chat.lastMessage.senderName}: </Text>
                )}
                {truncateMessage(chat.lastMessage.content)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
          
          {chat.group.course && (
            <View style={styles.courseBadgeRow}>
              <View style={styles.courseBadge}>
                <Text style={styles.courseBadgeText}>{chat.group.course.code}</Text>
              </View>
              <Text style={styles.memberCount}>
                {chat.group.memberCount ?? chat.group.members?.length ?? 0} members
              </Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }, [colors, styles, formatTime, truncateMessage, handleChatPress]);

  // Only show loading when actually fetching groups OR when groups exist and we're loading their previews
  if (isLoading || (myGroups.length > 0 && loadingPreviews)) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </Screen>
    );
  }

  // Show error state if groups failed to load
  if (groupsError) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Failed to load chats</Text>
          <Text style={styles.emptyMessage}>Check your connection and try again</Text>
          <Pressable 
            onPress={() => refetch()} 
            style={{ marginTop: spacing.md, padding: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={styles.heroBadge}>
              <Ionicons name="chatbubbles" size={14} color={colors.primary} />
              <Text style={styles.heroBadgeText}>MESSAGES</Text>
            </View>
            <Text style={styles.heading}>Conversations</Text>
          </View>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{totalUnread} unread</Text>
            </View>
          )}
        </View>
        <Text style={styles.subheading}>Chat with your study groups</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.mainTabRow}>
        <Pressable
          style={[styles.mainTab, activeTab === 'groups' && styles.mainTabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.mainTabText, activeTab === 'groups' && styles.mainTabTextActive]}>
            Group Chats
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTab, activeTab === 'direct' && styles.mainTabActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.mainTabText, activeTab === 'direct' && styles.mainTabTextActive]}>
            Direct Messages
          </Text>
        </Pressable>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'direct' ? (
        <View style={{ flex: 1 }}>
          <DirectMessagesScreen embedded selectedConversationId={selectedConversationId} />
        </View>
      ) : (
        <>
          {/* Search & Filter Tabs */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search chats..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, groupsTabFilter === 'all' && styles.tabActive]}
                onPress={() => setGroupsTabFilter('all')}
              >
                <Text style={[styles.tabText, groupsTabFilter === 'all' && styles.tabTextActive]}>
                  All Chats
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, groupsTabFilter === 'unread' && styles.tabActive]}
                onPress={() => setGroupsTabFilter('unread')}
              >
                <Text style={[styles.tabText, groupsTabFilter === 'unread' && styles.tabTextActive]}>
                  Unread
                </Text>
                {totalUnread > 0 && (
                  <View style={[styles.tabBadge, groupsTabFilter === 'unread' && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, groupsTabFilter === 'unread' && styles.tabBadgeTextActive]}>
                      {totalUnread}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Chat List */}
          {filteredChats.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? 'No chats found'
                  : groupsTabFilter === 'unread'
                  ? 'No unread messages'
                  : 'No conversations yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery
                  ? 'Try a different search term'
                  : groupsTabFilter === 'unread'
                  ? "You're all caught up!"
                  : 'Join a study group to start messaging'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredChats}
              keyExtractor={item => item.group.id.toString()}
              renderItem={renderChatItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </>
      )}
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    header: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    subheading: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    totalUnreadBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    totalUnreadText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
    mainTabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    mainTab: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    mainTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    mainTabText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    mainTabTextActive: {
      color: colors.textOnPrimary,
    },
    searchSection: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
    },
    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textOnPrimary,
    },
    tabBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    tabBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
    tabBadgeTextActive: {
      color: colors.textOnPrimary,
    },
    listContent: {
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    separator: {
      height: spacing.sm,
    },
    chatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chatCardUnread: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    chatCardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    unreadBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      backgroundColor: colors.success,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    unreadBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFF',
    },
    chatInfo: {
      flex: 1,
      gap: 4,
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chatName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
    chatNameUnread: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    chatTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: spacing.sm,
    },
    chatTimeUnread: {
      color: colors.primary,
      fontWeight: '600',
    },
    lastMessageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    readIcon: {
      marginRight: 4,
    },
    lastMessage: {
      fontSize: 14,
      color: colors.textMuted,
      flex: 1,
    },
    lastMessageUnread: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
    senderName: {
      fontWeight: '600',
    },
    noMessages: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    courseBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4,
    },
    courseBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    courseBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    memberCount: {
      fontSize: 11,
      color: colors.textMuted,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

export default MessagesScreen;
