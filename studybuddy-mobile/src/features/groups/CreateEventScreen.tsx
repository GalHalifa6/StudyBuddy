import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { calendarApi, CreateEventRequest, EventType } from '../../api/calendar';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { GroupsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GroupsStackParamList, 'CreateEvent'>;
type Styles = ReturnType<typeof createStyles>;

const EVENT_TYPES: { type: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'STUDY_SESSION', label: 'Study Session', icon: 'book-outline' },
  { type: 'MEETING', label: 'Meeting', icon: 'people-outline' },
  { type: 'EXAM', label: 'Exam', icon: 'document-text-outline' },
  { type: 'ASSIGNMENT_DUE', label: 'Assignment Due', icon: 'clipboard-outline' },
  { type: 'PROJECT_DEADLINE', label: 'Project Deadline', icon: 'briefcase-outline' },
  { type: 'PRESENTATION', label: 'Presentation', icon: 'easel-outline' },
  { type: 'REVIEW_SESSION', label: 'Review Session', icon: 'refresh-outline' },
  { type: 'OTHER', label: 'Other', icon: 'calendar-outline' },
];

const CreateEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('STUDY_SESSION');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => calendarApi.createEvent(data),
    onSuccess: () => {
      showToast('Event created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      navigation.goBack();
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for the event.');
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            <Text style={styles.headerTitle}>Create Event</Text>
            <Text style={styles.headerSubtitle}>
              Schedule an event for {groupName || 'your group'}
            </Text>
          </View>

          {/* Event Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((item) => (
                  <Pressable
                    key={item.type}
                    style={[
                      styles.typeChip,
                      eventType === item.type && styles.typeChipActive,
                    ]}
                    onPress={() => setEventType(item.type)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={eventType === item.type ? colors.textOnPrimary : colors.textSecondary}
                    />
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
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Title *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="text-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Weekly Study Session"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details about the event..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Start Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Start Time</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.dateButtonText}>{formatDateTime(startDate)}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="default"
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) {
                    setStartDate(date);
                    // Auto-adjust end date if needed
                    if (date >= endDate) {
                      setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                    }
                  }
                }}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* End Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>End Time</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.dateButtonText}>{formatDateTime(endDate)}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display="default"
                onChange={(event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEndDate(date);
                }}
                minimumDate={startDate}
              />
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location (optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Library Room 101"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Meeting Link */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Meeting Link (optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.footer}>
            <Button
              label={createMutation.isPending ? 'Creating...' : 'Create Event'}
              onPress={handleSubmit}
              disabled={createMutation.isPending || !title.trim()}
              loading={createMutation.isPending}
            />
            <Button
              label="Cancel"
              onPress={() => navigation.goBack()}
              variant="ghost"
            />
          </View>
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
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
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
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeChipTextActive: {
      color: colors.textOnPrimary,
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
      fontSize: 16,
      color: colors.textPrimary,
    },
    footer: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
  });

export default CreateEventScreen;
