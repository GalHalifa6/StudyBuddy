import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { calendarApi, Event, EventType } from '../../api/calendar';
import { groupApi } from '../../api/groups';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { RootStackParamList } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Styles = ReturnType<typeof createStyles>;

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  STUDY_SESSION: 'book-outline',
  MEETING: 'people-outline',
  EXAM: 'document-text-outline',
  ASSIGNMENT_DUE: 'clipboard-outline',
  PROJECT_DEADLINE: 'briefcase-outline',
  PRESENTATION: 'easel-outline',
  REVIEW_SESSION: 'refresh-outline',
  OTHER: 'calendar-outline',
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  STUDY_SESSION: '#6366F1',
  MEETING: '#8B5CF6',
  EXAM: '#EF4444',
  ASSIGNMENT_DUE: '#F59E0B',
  PROJECT_DEADLINE: '#F97316',
  PRESENTATION: '#10B981',
  REVIEW_SESSION: '#14B8A6',
  OTHER: '#64748B',
};

interface UpcomingEventsScreenProps {
  navigation?: any;
}

const UpcomingEventsScreen: React.FC<UpcomingEventsScreenProps> = ({ navigation: propNavigation }) => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [fabScale] = useState(new Animated.Value(1));

  const {
    data: events = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['calendar', 'myUpcoming'],
    queryFn: calendarApi.getMyUpcomingEvents,
  });

  // Fetch user's groups for the group picker
  const { data: myGroups = [] } = useQuery({
    queryKey: ['groups', 'my-groups'],
    queryFn: groupApi.myGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: calendarApi.deleteEvent,
    onSuccess: () => {
      showToast('Event deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleDeleteEvent = useCallback((event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(event.id),
        },
      ]
    );
  }, [deleteMutation]);

  const handleFabPressIn = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const handleCreateEvent = useCallback(() => {
    if (myGroups.length === 0) {
      Alert.alert(
        'No Groups',
        'You need to join a group before creating an event. Would you like to browse groups?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Browse Groups', onPress: () => propNavigation?.navigate?.('Groups') },
        ]
      );
      return;
    }
    if (myGroups.length === 1) {
      // Only one group, go directly to create event
      rootNavigation.navigate('CreateEventModal', { 
        groupId: myGroups[0].id, 
        groupName: myGroups[0].name 
      });
    } else {
      // Multiple groups, show picker
      setShowGroupPicker(true);
    }
  }, [myGroups, rootNavigation, propNavigation]);

  const handleSelectGroup = useCallback((group: { id: number; name: string }) => {
    setShowGroupPicker(false);
    rootNavigation.navigate('CreateEventModal', { 
      groupId: group.id, 
      groupName: group.name 
    });
  }, [rootNavigation]);

  const filteredEvents = useMemo(() => {
    if (!selectedType) return events;
    return events.filter(e => e.eventType === selectedType);
  }, [events, selectedType]);

  const eventTypeFilters = useMemo(() => {
    const types = new Set<EventType>();
    events.forEach(e => types.add(e.eventType));
    return Array.from(types);
  }, [events]);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  }, []);

  const getTimeUntil = useCallback((dateString: string) => {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'Started';
    if (diffMins < 60) return `In ${diffMins}m`;
    if (diffHours < 24) return `In ${diffHours}h`;
    if (diffDays < 7) return `In ${diffDays}d`;
    return formatDateTime(dateString).date;
  }, [formatDateTime]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroBadgeText}>YOUR SCHEDULE</Text>
            </View>
            <Text style={styles.heroTitle}>Upcoming Events</Text>
            <Text style={styles.heroSubtitle}>
              Stay on top of your study sessions, meetings, and deadlines
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{events.length}</Text>
                <Text style={styles.heroStatLabel}>Total Events</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>
                  {events.filter(e => {
                    const d = new Date(e.startDateTime);
                    const now = new Date();
                    return d.toDateString() === now.toDateString();
                  }).length}
                </Text>
                <Text style={styles.heroStatLabel}>Today</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Filters */}
        {eventTypeFilters.length > 1 && (
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                style={[styles.filterChip, !selectedType && styles.filterChipActive]}
                onPress={() => setSelectedType(null)}
              >
                <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>
                  All
                </Text>
              </Pressable>
              {eventTypeFilters.map(type => (
                <Pressable
                  key={type}
                  style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                  onPress={() => setSelectedType(type === selectedType ? null : type)}
                >
                  <Ionicons
                    name={EVENT_TYPE_ICONS[type]}
                    size={14}
                    color={selectedType === type ? colors.textOnPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                    {type.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No upcoming events</Text>
            <Text style={styles.emptyMessage}>
              {myGroups.length > 0 
                ? "You don't have any upcoming events yet. Create one for your group!"
                : "Events from your study groups will appear here. Join a group to get started!"}
            </Text>
            <View style={styles.emptyButtonsRow}>
              {myGroups.length > 0 && (
                <Button
                  label="Create Event"
                  onPress={handleCreateEvent}
                  variant="primary"
                />
              )}
              <Button
                label="Browse Groups"
                onPress={() => propNavigation?.navigate?.('Groups')}
                variant={myGroups.length > 0 ? 'ghost' : 'primary'}
              />
            </View>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {filteredEvents.map((event, index) => {
              const datetime = formatDateTime(event.startDateTime);
              const typeColor = EVENT_TYPE_COLORS[event.eventType] || colors.primary;
              const timeUntil = getTimeUntil(event.startDateTime);
              const isToday = new Date(event.startDateTime).toDateString() === new Date().toDateString();

              return (
                <Pressable
                  key={event.id}
                  style={({ pressed }) => [
                    styles.eventCard,
                    pressed && styles.eventCardPressed,
                    isToday && styles.eventCardToday,
                  ]}
                  onLongPress={() => handleDeleteEvent(event)}
                >
                  {/* Color indicator */}
                  <View style={[styles.eventColorBar, { backgroundColor: typeColor }]} />
                  
                  <View style={styles.eventContent}>
                    {/* Header */}
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventTypeIcon, { backgroundColor: `${typeColor}20` }]}>
                        <Ionicons name={EVENT_TYPE_ICONS[event.eventType]} size={18} color={typeColor} />
                      </View>
                      <View style={styles.eventTitleArea}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.eventGroup} numberOfLines={1}>{event.groupName}</Text>
                      </View>
                      <View style={[styles.timeUntilBadge, isToday && styles.timeUntilBadgeToday]}>
                        <Text style={[styles.timeUntilText, isToday && styles.timeUntilTextToday]}>
                          {timeUntil}
                        </Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.eventDetailText}>{datetime.date}</Text>
                      </View>
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.eventDetailText}>{datetime.time}</Text>
                      </View>
                      {event.location && (
                        <View style={styles.eventDetailRow}>
                          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                          <Text style={styles.eventDetailText} numberOfLines={1}>{event.location}</Text>
                        </View>
                      )}
                    </View>

                    {/* Description */}
                    {event.description && (
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {event.description}
                      </Text>
                    )}

                    {/* Actions */}
                    <View style={styles.eventActions}>
                      {event.meetingLink && (
                        <Pressable style={styles.joinButton}>
                          <Ionicons name="videocam" size={14} color={colors.textOnPrimary} />
                          <Text style={styles.joinButtonText}>Join Meeting</Text>
                        </Pressable>
                      )}
                      <View style={[styles.eventTypeBadge, { backgroundColor: `${typeColor}15` }]}>
                        <Text style={[styles.eventTypeBadgeText, { color: typeColor }]}>
                          {event.eventType.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPress={handleCreateEvent}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Group Picker Modal */}
      <Modal
        visible={showGroupPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowGroupPicker(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select a Group</Text>
            <Text style={styles.modalSubtitle}>Choose which group to create the event for</Text>
            
            <ScrollView 
              style={styles.groupList}
              showsVerticalScrollIndicator={false}
            >
              {myGroups.map((group) => (
                <Pressable
                  key={group.id}
                  style={({ pressed }) => [
                    styles.groupOption,
                    pressed && styles.groupOptionPressed,
                  ]}
                  onPress={() => handleSelectGroup(group)}
                >
                  <View style={styles.groupIconWrap}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    {group.course?.name && (
                      <Text style={styles.groupCourse}>{group.course.name}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable 
              style={styles.cancelButton}
              onPress={() => setShowGroupPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: spacing.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    hero: {
      borderRadius: borderRadius.xxl,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    heroContent: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.5,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroSubtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 22,
    },
    heroStats: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    heroStatCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    heroStatValue: {
      fontSize: 26,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroStatLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    filterSection: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      marginRight: spacing.sm,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: colors.textOnPrimary,
    },
    emptyState: {
      alignItems: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    emptyButtonsRow: {
      flexDirection: 'column',
      gap: spacing.sm,
      width: '100%',
      paddingHorizontal: spacing.lg,
    },
    eventsContainer: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    eventCardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    eventCardToday: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    eventColorBar: {
      width: 4,
    },
    eventContent: {
      flex: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    eventHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    eventTypeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventTitleArea: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    eventGroup: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    timeUntilBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
    },
    timeUntilBadgeToday: {
      backgroundColor: colors.primaryLight,
    },
    timeUntilText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    timeUntilTextToday: {
      color: colors.primary,
    },
    eventDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    eventDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    eventDetailText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    eventDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    eventActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    joinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.success,
    },
    joinButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textOnPrimary,
    },
    eventTypeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    eventTypeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // FAB Styles
    fabContainer: {
      position: 'absolute',
      bottom: spacing.xl,
      right: spacing.lg,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
      maxHeight: '70%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    groupList: {
      maxHeight: 300,
    },
    groupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    groupOptionPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    groupIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    groupCourse: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cancelButton: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default UpcomingEventsScreen;
