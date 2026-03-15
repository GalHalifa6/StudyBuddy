import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { calendarApi, CreateEventRequest, EventType } from '../../api/calendar';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEventModal'>;
type Styles = ReturnType<typeof createStyles>;

const EVENT_TYPES: { type: EventType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'STUDY_SESSION', label: 'Study Session', icon: 'book-outline', color: '#6366F1' },
  { type: 'MEETING', label: 'Meeting', icon: 'people-outline', color: '#8B5CF6' },
  { type: 'EXAM', label: 'Exam', icon: 'document-text-outline', color: '#EF4444' },
  { type: 'ASSIGNMENT_DUE', label: 'Assignment', icon: 'clipboard-outline', color: '#F59E0B' },
  { type: 'PROJECT_DEADLINE', label: 'Deadline', icon: 'briefcase-outline', color: '#F97316' },
  { type: 'PRESENTATION', label: 'Presentation', icon: 'easel-outline', color: '#10B981' },
  { type: 'REVIEW_SESSION', label: 'Review', icon: 'refresh-outline', color: '#14B8A6' },
  { type: 'OTHER', label: 'Other', icon: 'calendar-outline', color: '#64748B' },
];

const CreateEventModalScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('STUDY_SESSION');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const selectedTypeInfo = EVENT_TYPES.find(t => t.type === eventType) || EVENT_TYPES[0];

  const createMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => calendarApi.createEvent(data),
    onSuccess: () => {
      showToast('🎉 Event created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      navigation.goBack();
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your event.');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      eventType,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
      groupId,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Screen scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <LinearGradient
              colors={[selectedTypeInfo.color, `${selectedTypeInfo.color}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconWrap}>
                <Ionicons name={selectedTypeInfo.icon} size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>New Event</Text>
              <View style={styles.heroGroupBadge}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroGroupText}>{groupName || 'Your Group'}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Event Type Selection */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((item) => (
                  <Pressable
                    key={item.type}
                    style={[
                      styles.typeChip,
                      eventType === item.type && [styles.typeChipActive, { backgroundColor: item.color }],
                    ]}
                    onPress={() => setEventType(item.type)}
                  >
                    <View style={[
                      styles.typeChipIcon,
                      { backgroundColor: eventType === item.type ? 'rgba(255,255,255,0.2)' : `${item.color}20` }
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={eventType === item.type ? '#FFFFFF' : item.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeChipText,
                        eventType === item.type && styles.typeChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          {/* Title Input */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>Event Title *</Text>
            <View style={[styles.inputContainer, title.length > 0 && styles.inputContainerFocused]}>
              <Ionicons name="text-outline" size={20} color={title.length > 0 ? colors.primary : colors.textMuted} />
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Give your event a catchy title..."
                placeholderTextColor={colors.textMuted}
                maxLength={100}
              />
              {title.length > 0 && (
                <Pressable onPress={() => setTitle('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* Description */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>Description</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What's this event about? Add any helpful details..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {/* Date & Time Section */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>When</Text>
            <View style={styles.dateTimeRow}>
              {/* Start Date */}
              <View style={styles.dateTimeCol}>
                <Text style={styles.dateTimeSubLabel}>Starts</Text>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={selectedTypeInfo.color} />
                  <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                </Pressable>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={selectedTypeInfo.color} />
                  <Text style={styles.dateButtonText}>{formatTime(startDate)}</Text>
                </Pressable>
              </View>

              <View style={styles.dateTimeDivider}>
                <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
              </View>

              {/* End Date */}
              <View style={styles.dateTimeCol}>
                <Text style={styles.dateTimeSubLabel}>Ends</Text>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={selectedTypeInfo.color} />
                  <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                </Pressable>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={selectedTypeInfo.color} />
                  <Text style={styles.dateButtonText}>{formatTime(endDate)}</Text>
                </Pressable>
              </View>
            </View>

            {/* Date/Time Pickers */}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) {
                    const newDate = new Date(startDate);
                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setStartDate(newDate);
                    if (newDate >= endDate) {
                      const newEndDate = new Date(newDate.getTime() + 60 * 60 * 1000);
                      setEndDate(newEndDate);
                    }
                  }
                }}
                minimumDate={new Date()}
              />
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowStartTimePicker(Platform.OS === 'ios');
                  if (date) {
                    setStartDate(date);
                    if (date >= endDate) {
                      setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                    }
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) {
                    const newDate = new Date(endDate);
                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setEndDate(newDate);
                  }
                }}
                minimumDate={startDate}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowEndTimePicker(Platform.OS === 'ios');
                  if (date) setEndDate(date);
                }}
              />
            )}
          </Animated.View>

          {/* Location */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Where will this take place?"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Animated.View>

          {/* Meeting Link */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionLabel}>Virtual Meeting Link</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="Add Zoom, Meet, or Teams link..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </Animated.View>

          {/* Submit Buttons */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: selectedTypeInfo.color },
                pressed && styles.submitButtonPressed,
                (createMutation.isPending || !title.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Event</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.lg,
    },
    hero: {
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroGroupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    heroGroupText: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: spacing.xs,
    },
    typeGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingRight: spacing.md,
      paddingLeft: spacing.xs,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: {
      borderColor: 'transparent',
    },
    typeChipIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeChipTextActive: {
      color: '#FFFFFF',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputContainerFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    textAreaContainer: {
      alignItems: 'flex-start',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dateTimeCol: {
      flex: 1,
      gap: spacing.sm,
    },
    dateTimeDivider: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
    },
    dateTimeSubLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginLeft: spacing.xs,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateButtonText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    footer: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cancelButton: {
      alignItems: 'center',
      padding: spacing.md,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default CreateEventModalScreen;
