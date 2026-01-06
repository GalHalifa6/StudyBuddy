import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { groupApi } from '../../api/groups';
import { matchingApi } from '../../api/matching';
import { GroupMemberRequest, StudyGroup, GroupMatch } from '../../api/types';
import { courseApi } from '../../api/courses';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { GroupsStackParamList } from '../../navigation/types';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupsHome'>;

const GroupsScreen: React.FC<Props> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'mygroups' | 'explore'>('mygroups');
  const [searchQuery, setSearchQuery] = useState('');
  const [exploreFilter, setExploreFilter] = useState<'best' | 'all' | 'open'>('best');
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: myGroups,
    isLoading: loadingMyGroups,
  } = useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: groupApi.myGroups,
  });

  const {
    data: myInvites,
    isLoading: loadingInvites,
  } = useQuery({
    queryKey: ['groups', 'invites'],
    queryFn: groupApi.myInvites,
  });

  const {
    data: myRequests,
    isLoading: loadingRequests,
  } = useQuery({
    queryKey: ['groups', 'requests'],
    queryFn: groupApi.myRequests,
  });

  const {
    data: myCourses,
    isLoading: loadingCourses,
  } = useQuery({
    queryKey: ['courses', 'my'],
    queryFn: courseApi.getMyCourses,
  });

  const {
    data: courseGroups,
    isFetching: loadingCourseGroups,
  } = useQuery({
    queryKey: ['groups', 'course', selectedCourseId],
    enabled: selectedCourseId != null,
    queryFn: async () => {
      if (selectedCourseId == null) {
        return [] as StudyGroup[];
      }
      return groupApi.getByCourse(selectedCourseId);
    },
  });

  // Fetch recommended groups with match percentages
  const {
    data: matchedGroups,
    isLoading: loadingMatchedGroups,
  } = useQuery({
    queryKey: ['matching', 'groups'],
    queryFn: () => matchingApi.getMatchedGroups(),
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId: number) => groupApi.join(groupId),
    onSuccess: _ => {
      showToast('Join request sent', 'success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const requestJoinMutation = useMutation({
    mutationFn: (groupId: number) => groupApi.requestJoin(groupId),
    onSuccess: _ => {
      showToast('Join request sent', 'info');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: number) => groupApi.leave(groupId),
    onSuccess: _ => {
      showToast('You left the group', 'info');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (requestId: number) => groupApi.acceptRequest(requestId),
    onSuccess: () => {
      showToast('Invitation accepted', 'success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const rejectInviteMutation = useMutation({
    mutationFn: (requestId: number) => groupApi.rejectRequest(requestId),
    onSuccess: () => {
      showToast('Invitation declined', 'info');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const handleCourseSelect = (courseId: number) => {
    setSelectedCourseId(prev => (prev === courseId ? null : courseId));
  };

  const handleGroupAction = (group: StudyGroup) => {
    const isMember = group.members?.some(member => member.id === user?.id) ?? false;
    const isOpen = group.visibility === 'open';

    if (isMember) {
      leaveGroupMutation.mutate(group.id);
      return;
    }

    if (isOpen) {
      joinGroupMutation.mutate(group.id);
      return;
    }

    requestJoinMutation.mutate(group.id);
  };

  const invitesPending = acceptInviteMutation.isPending || rejectInviteMutation.isPending;
  const membershipPending = joinGroupMutation.isPending || requestJoinMutation.isPending || leaveGroupMutation.isPending;

  const activeCourseGroups = useMemo(() => courseGroups ?? [], [courseGroups]);

  // Filter out groups user is already a member of for recommendations
  const recommendedGroups = useMemo(() => {
    if (!matchedGroups) return [];
    return matchedGroups
      .filter(g => !g.isMember && !g.hasPendingRequest)
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 5);
  }, [matchedGroups]);

  const renderMatchedGroupCard = ({ item }: { item: GroupMatch }) => {
    const isOpen = item.visibility === 'open';
    const actionLabel = isOpen ? 'Join' : 'Request';
    const matchColor = item.matchPercentage >= 80 ? colors.success : item.matchPercentage >= 60 ? colors.primary : colors.warning;

    return (
      <Pressable
        style={({ pressed }) => [styles.groupCard, styles.matchedGroupCard, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.groupId })}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.groupIcon, { backgroundColor: `${matchColor}20` }]}>
              <Ionicons name="sparkles" size={20} color={matchColor} />
            </View>
            <View style={styles.cardTitleArea}>
              <Text style={styles.groupTitle} numberOfLines={1}>{item.groupName}</Text>
              {item.courseName ? (
                <Text style={styles.groupTopic} numberOfLines={1}>{item.courseCode ?? ''} {item.courseName}</Text>
              ) : item.topic ? (
                <Text style={styles.groupTopic} numberOfLines={1}>{item.topic}</Text>
              ) : null}
            </View>
            {/* Match Percentage Badge */}
            <View style={[styles.matchBadge, { backgroundColor: `${matchColor}15`, borderColor: `${matchColor}30` }]}>
              <Ionicons name="sparkles" size={12} color={matchColor} />
              <Text style={[styles.matchBadgeText, { color: matchColor }]}>{item.matchPercentage}%</Text>
            </View>
          </View>
          {/* Match Reason */}
          {item.matchReason ? (
            <View style={styles.matchReasonContainer}>
              <Text style={styles.matchReasonText} numberOfLines={2}>{item.matchReason}</Text>
            </View>
          ) : null}
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person" size={14} color={colors.textMuted} />
              <Text style={styles.groupMeta}>{item.currentSize}/{item.maxSize} members</Text>
            </View>
            <View style={[styles.visibilityBadge, isOpen ? styles.visibilityOpen : styles.visibilityClosed]}>
              <Ionicons
                name={isOpen ? 'lock-open' : 'lock-closed'}
                size={12}
                color={isOpen ? colors.success : colors.warning}
              />
              <Text style={[styles.visibilityText, isOpen ? styles.visibilityTextOpen : styles.visibilityTextClosed]}>
                {isOpen ? 'Open' : 'Private'}
              </Text>
            </View>
          </View>
        </View>
        <Button
          label={actionLabel}
          onPress={() => isOpen ? joinGroupMutation.mutate(item.groupId) : requestJoinMutation.mutate(item.groupId)}
          variant="primary"
          size="sm"
          disabled={membershipPending}
          icon="enter-outline"
          style={styles.groupAction}
        />
      </Pressable>
    );
  };

  const renderGroupCard = ({ item }: { item: StudyGroup }) => {
    const isMember = item.members?.some(member => member.id === user?.id) ?? false;
    const actionLabel = isMember ? 'Leave' : item.visibility === 'open' ? 'Join' : 'Request';
    const memberCount = item.memberCount ?? item.members?.length ?? 0;
    const isOpen = item.visibility === 'open';

    return (
      <Pressable
        style={({ pressed }) => [styles.groupCard, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.groupIcon, isMember && styles.groupIconActive]}>
              <Ionicons
                name={isMember ? 'people' : 'people-outline'}
                size={20}
                color={isMember ? colors.textOnPrimary : colors.primary}
              />
            </View>
            <View style={styles.cardTitleArea}>
              <Text style={styles.groupTitle} numberOfLines={1}>{item.name}</Text>
              {item.topic ? (
                <Text style={styles.groupTopic} numberOfLines={1}>{item.topic}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person" size={14} color={colors.textMuted} />
              <Text style={styles.groupMeta}>{memberCount} members</Text>
            </View>
            <View style={[styles.visibilityBadge, isOpen ? styles.visibilityOpen : styles.visibilityClosed]}>
              <Ionicons
                name={isOpen ? 'lock-open' : 'lock-closed'}
                size={12}
                color={isOpen ? colors.success : colors.warning}
              />
              <Text style={[styles.visibilityText, isOpen ? styles.visibilityTextOpen : styles.visibilityTextClosed]}>
                {isOpen ? 'Open' : 'Private'}
              </Text>
            </View>
          </View>
        </View>
        <Button
          label={actionLabel}
          onPress={() => handleGroupAction(item)}
          variant={isMember ? 'ghost' : 'primary'}
          size="sm"
          disabled={membershipPending}
          style={styles.groupAction}
        />
      </Pressable>
    );
  };

  const renderMyGroup = ({ item }: { item: StudyGroup }) => {
    const memberCount = item.memberCount ?? item.members?.length ?? 0;

    return (
      <Pressable
        style={({ pressed }) => [styles.myGroupCard, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.groupIcon, styles.groupIconActive]}>
              <Ionicons name="people" size={20} color={colors.textOnPrimary} />
            </View>
            <View style={styles.cardTitleArea}>
              <Text style={styles.groupTitle} numberOfLines={1}>{item.name}</Text>
              {item.course?.name ? (
                <Text style={styles.groupTopic} numberOfLines={1}>{item.course.name}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person" size={14} color={colors.textMuted} />
              <Text style={styles.groupMeta}>{memberCount} members</Text>
            </View>
            <View style={styles.memberBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.memberBadgeText}>Member</Text>
            </View>
          </View>
        </View>
        <Button
          label="Leave"
          onPress={() => leaveGroupMutation.mutate(item.id)}
          variant="ghost"
          size="sm"
          disabled={leaveGroupMutation.isPending}
          style={styles.smallAction}
        />
      </Pressable>
    );
  };

  const renderInvite = ({ item }: { item: GroupMemberRequest }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteIcon}>
          <Ionicons name="mail" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.groupTitle}>{item.group.name}</Text>
          <View style={styles.metaItem}>
            <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.groupMeta}>
              Invited by {item.invitedBy?.fullName ?? item.invitedBy?.username ?? 'Group owner'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <Button
          label="Accept"
          icon="checkmark"
          onPress={() => acceptInviteMutation.mutate(item.id)}
          disabled={invitesPending}
          style={styles.inviteButton}
        />
        <Button
          label="Decline"
          icon="close"
          variant="ghost"
          onPress={() => rejectInviteMutation.mutate(item.id)}
          disabled={invitesPending}
          style={styles.inviteButton}
        />
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: GroupMemberRequest }) => {
    const statusColor = item.status === 'PENDING' ? colors.warning : item.status === 'ACCEPTED' ? colors.success : colors.error;
    const statusIcon = item.status === 'PENDING' ? 'time' : item.status === 'ACCEPTED' ? 'checkmark-circle' : 'close-circle';

    return (
      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.requestIcon}>
            <Ionicons name="send" size={18} color={colors.secondary} />
          </View>
          <View style={styles.cardTitleArea}>
            <Text style={styles.groupTitle}>{item.group.name}</Text>
            <View style={styles.requestMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
              <Text style={styles.groupMeta}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Filter explore groups based on search and filter
  const filteredExploreGroups = useMemo(() => {
    let groups = matchedGroups ?? [];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups.filter(g => 
        g.groupName.toLowerCase().includes(query) ||
        g.courseName?.toLowerCase().includes(query) ||
        g.courseCode?.toLowerCase().includes(query) ||
        g.topic?.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (exploreFilter === 'best') {
      groups = groups.filter(g => !g.isMember && !g.hasPendingRequest).sort((a, b) => b.matchPercentage - a.matchPercentage);
    } else if (exploreFilter === 'open') {
      groups = groups.filter(g => g.visibility === 'open' && !g.isMember);
    } else {
      groups = groups.filter(g => !g.isMember);
    }
    
    return groups;
  }, [matchedGroups, searchQuery, exploreFilter]);

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero Card */}
        <LinearGradient
          colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.heroBadgeText}>COLLABORATION</Text>
          </View>
          <Text style={styles.heading}>Study groups</Text>
          <Text style={styles.subheading}>
            Team up with classmates, share resources, and stay accountable together.
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{myGroups?.length ?? 0}</Text>
              <Text style={styles.statLabel}>My Groups</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{myInvites?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Invites</Text>
            </View>
          </View>
          <Button
            label="Create a group"
            onPress={() =>
              navigation.navigate('CreateGroup', selectedCourseId ? { courseId: selectedCourseId } : undefined)
            }
            icon="add-circle-outline"
          />
        </LinearGradient>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'mygroups' && styles.tabActive]}
            onPress={() => setActiveTab('mygroups')}
          >
            <Ionicons 
              name="people" 
              size={16} 
              color={activeTab === 'mygroups' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'mygroups' && styles.tabTextActive]}>My Groups</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'explore' && styles.tabActive]}
            onPress={() => setActiveTab('explore')}
          >
            <Ionicons 
              name="compass" 
              size={16} 
              color={activeTab === 'explore' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explore</Text>
          </Pressable>
        </View>

        {activeTab === 'mygroups' ? (
          <>
            <Section
              title="My groups"
              loading={loadingMyGroups}
              emptyMessage="You are not part of any groups yet."
              isEmpty={!myGroups?.length}
              colors={colors}
              styles={styles}
            >
              <FlatList
                data={myGroups}
                keyExtractor={item => item.id.toString()}
                renderItem={renderMyGroup}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            </Section>

            <Section
              title="Invitations"
              loading={loadingInvites}
              emptyMessage="No pending invitations."
              isEmpty={!myInvites?.length}
              colors={colors}
              styles={styles}
            >
              <FlatList
                data={myInvites}
                keyExtractor={item => item.id.toString()}
                renderItem={renderInvite}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            </Section>

            <Section
              title="My join requests"
              loading={loadingRequests}
              emptyMessage="You have no pending requests."
              isEmpty={!myRequests?.length}
              colors={colors}
              styles={styles}
            >
              <FlatList
                data={myRequests}
                keyExtractor={item => item.id.toString()}
                renderItem={renderRequest}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            </Section>
          </>
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search groups..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, exploreFilter === 'best' && styles.filterChipActive]}
                onPress={() => setExploreFilter('best')}
              >
                <Ionicons 
                  name="sparkles" 
                  size={14} 
                  color={exploreFilter === 'best' ? colors.textOnPrimary : colors.primary} 
                />
                <Text style={[styles.filterChipText, exploreFilter === 'best' && styles.filterChipTextActive]}>
                  Best Match
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, exploreFilter === 'all' && styles.filterChipActive]}
                onPress={() => setExploreFilter('all')}
              >
                <Ionicons 
                  name="grid" 
                  size={14} 
                  color={exploreFilter === 'all' ? colors.textOnPrimary : colors.primary} 
                />
                <Text style={[styles.filterChipText, exploreFilter === 'all' && styles.filterChipTextActive]}>
                  All Groups
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, exploreFilter === 'open' && styles.filterChipActive]}
                onPress={() => setExploreFilter('open')}
              >
                <Ionicons 
                  name="lock-open" 
                  size={14} 
                  color={exploreFilter === 'open' ? colors.textOnPrimary : colors.primary} 
                />
                <Text style={[styles.filterChipText, exploreFilter === 'open' && styles.filterChipTextActive]}>
                  Open Only
                </Text>
              </Pressable>
            </View>

            {/* Explore Results */}
            <Section
              title={`${filteredExploreGroups.length} groups found`}
              loading={loadingMatchedGroups}
              emptyMessage="No groups match your search."
              isEmpty={!filteredExploreGroups.length}
              colors={colors}
              styles={styles}
            >
              <FlatList
                data={filteredExploreGroups}
                keyExtractor={item => item.groupId.toString()}
                renderItem={renderMatchedGroupCard}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            </Section>

            {/* Browse by Course */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse by course</Text>
              {loadingCourses ? (
                <ActivityIndicator color={colors.primary} />
              ) : myCourses?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {myCourses.map(course => {
                    const isActive = course.id === selectedCourseId;
                    return (
                      <Pressable
                        key={course.id}
                        style={[styles.courseChip, isActive ? styles.courseChipActive : null]}
                        onPress={() => handleCourseSelect(course.id)}
                      >
                        <Text style={styles.courseChipText}>{course.code}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.emptyMeta}>Enroll in a course to browse its study groups.</Text>
              )}

              {selectedCourseId ? (
                loadingCourseGroups ? (
                  <ActivityIndicator color={colors.primary} />
                ) : activeCourseGroups.length ? (
                  <FlatList
                    data={activeCourseGroups}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderGroupCard}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.emptyMeta}>No groups yet for this course. Be the first to create one!</Text>
                )
              ) : null}
            </View>
          </>
        )}
      </ScrollView>>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      gap: spacing.xl,
      paddingBottom: spacing.xl,
    },
    heroCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
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
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyMeta: {
      fontSize: 14,
      color: colors.textSecondary,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    myGroupCard: {
      flexDirection: 'column',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.success,
    },
    groupCard: {
      flexDirection: 'column',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardPressed: {
      opacity: 0.95,
      transform: [{ scale: 0.99 }],
    },
    cardContent: {
      flex: 1,
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardTitleArea: {
      flex: 1,
      gap: 2,
    },
    groupIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupIconActive: {
      backgroundColor: colors.primary,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    groupTopic: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginLeft: 52,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    groupMeta: {
      fontSize: 13,
      color: colors.textMuted,
    },
    visibilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    visibilityOpen: {
      backgroundColor: colors.successLight,
    },
    visibilityClosed: {
      backgroundColor: colors.warningLight,
    },
    visibilityText: {
      fontSize: 11,
      fontWeight: '600',
    },
    visibilityTextOpen: {
      color: colors.success,
    },
    visibilityTextClosed: {
      color: colors.warning,
    },
    memberBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: colors.successLight,
    },
    memberBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.success,
    },
    groupAction: {
      alignSelf: 'stretch',
    },
    smallAction: {
      alignSelf: 'stretch',
    },
    inviteCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: spacing.md,
    },
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    inviteIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    inviteButton: {
      flex: 1,
    },
    requestCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.secondaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    chipRow: {
      gap: spacing.sm,
    },
    courseChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    courseChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    courseChipText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    matchedGroupCard: {
      borderColor: colors.primary,
      borderWidth: 1,
    },
    matchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    matchBadgeText: {
      fontSize: 13,
      fontWeight: '700',
    },
    matchReasonContainer: {
      marginLeft: 52,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    matchReasonText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    recommendedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    recommendedSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.xl,
      padding: 4,
      gap: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
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
    searchContainer: {
      marginBottom: spacing.sm,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      paddingVertical: spacing.xs,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    filterChipTextActive: {
      color: colors.textOnPrimary,
    },
  });

type Styles = ReturnType<typeof createStyles>;

type SectionProps = {
  title: string;
  loading?: boolean;
  emptyMessage: string;
  isEmpty: boolean;
  children: React.ReactNode;
  styles: Styles;
  colors: Palette;
};

const Section: React.FC<SectionProps> = ({ title, loading = false, emptyMessage, isEmpty, children, styles, colors }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {loading ? (
      <ActivityIndicator color={colors.primary} />
    ) : isEmpty ? (
      <Text style={styles.emptyMeta}>{emptyMessage}</Text>
    ) : (
      children
    )}
  </View>
);

export default GroupsScreen;
