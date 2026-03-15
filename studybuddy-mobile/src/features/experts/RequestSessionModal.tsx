import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { sessionRequestApi, TimeSlot } from '../../api/experts';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

interface RequestSessionModalProps {
  visible: boolean;
  onClose: () => void;
  expertId: number;
  expertName: string;
}

type Styles = ReturnType<typeof createStyles>;

const RequestSessionModal: React.FC<RequestSessionModalProps> = ({ visible, onClose, expertId, expertName }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agenda, setAgenda] = useState('');
  const [timeSlots, setTimeSlots] = useState<Array<{ start: string; end: string }>>([]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      expertId: number;
      title: string;
      description?: string;
      agenda?: string;
      preferredTimeSlots: TimeSlot[];
    }) => sessionRequestApi.createRequest(payload),
    onSuccess: () => {
      showToast('Session request submitted! The expert will be notified.', 'success');
      queryClient.invalidateQueries({ queryKey: ['sessionRequests'] });
      handleClose();
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setAgenda('');
    setTimeSlots([]);
    onClose();
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '', end: '' }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots(newSlots);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a session title');
      return;
    }
    if (timeSlots.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one preferred time slot');
      return;
    }
    const validSlots = timeSlots.filter((slot) => slot.start && slot.end);
    if (validSlots.length === 0) {
      Alert.alert('Validation Error', 'Please fill in at least one complete time slot');
      return;
    }

    // Parse date strings to ISO format
    const parsedSlots = validSlots.map((slot) => {
      try {
        // Try to parse the date string
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }
        return {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
      } catch (error) {
        // If parsing fails, try to fix common format issues
        // For format like "2024-12-25 14:00", replace space with T
        const startFixed = slot.start.replace(' ', 'T');
        const endFixed = slot.end.replace(' ', 'T');
        return {
          start: new Date(startFixed).toISOString(),
          end: new Date(endFixed).toISOString(),
        };
      }
    });

    createMutation.mutate({
      expertId,
      title: title.trim(),
      description: description.trim() || undefined,
      agenda: agenda.trim() || undefined,
      preferredTimeSlots: parsedSlots,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Request Session with {expertName}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {/* Session Title */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Session Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Python Help Session"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What topics would you like to cover?"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary },
                ]}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Agenda */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Agenda (optional)</Text>
              <TextInput
                value={agenda}
                onChangeText={setAgenda}
                placeholder="Specific points to discuss..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary },
                ]}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Preferred Time Slots */}
            <View style={styles.field}>
              <View style={styles.timeSlotsHeader}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Preferred Time Slots *</Text>
                <Pressable onPress={addTimeSlot} style={[styles.addButton, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={18} color={colors.textOnPrimary} />
                  <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>Add Slot</Text>
                </Pressable>
              </View>

              {timeSlots.length === 0 ? (
                <Text style={[styles.helperText, { color: colors.textMuted }]}>Click "Add Slot" to add your preferred times</Text>
              ) : (
                <View style={styles.timeSlotsList}>
                  {timeSlots.map((slot, index) => (
                    <View key={index} style={[styles.timeSlotRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                      <View style={styles.timeSlotInputs}>
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start (YYYY-MM-DD HH:mm)</Text>
                          <TextInput
                            value={slot.start || ''}
                            onChangeText={(value) => updateTimeSlot(index, 'start', value)}
                            placeholder="2024-12-25 14:00"
                            placeholderTextColor={colors.textMuted}
                            style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                        <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>to</Text>
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End (YYYY-MM-DD HH:mm)</Text>
                          <TextInput
                            value={slot.end || ''}
                            onChangeText={(value) => updateTimeSlot(index, 'end', value)}
                            placeholder="2024-12-25 15:00"
                            placeholderTextColor={colors.textMuted}
                            style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                      </View>
                      <Pressable onPress={() => removeTimeSlot(index)} style={styles.removeButton}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Button label="Cancel" onPress={handleClose} variant="secondary" />
            <Button
              label={createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              onPress={handleSubmit}
              disabled={createMutation.isPending || !title.trim() || timeSlots.length === 0}
              loading={createMutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      borderWidth: 1,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      flex: 1,
    },
    closeButton: {
      padding: spacing.xs,
    },
    modalBody: {
      flex: 1,
    },
    modalBodyContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: 1,
    },
    field: {
      gap: spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
    },
    input: {
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      fontSize: 15,
    },
    textArea: {
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      fontSize: 15,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    helperText: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    timeSlotsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    timeSlotsList: {
      gap: spacing.md,
    },
    timeSlotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
    },
    timeSlotInputs: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    timeInputGroup: {
      flex: 1,
      gap: spacing.xs,
    },
    timeLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    timeInput: {
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      borderWidth: 1,
      fontSize: 14,
    },
    timeSeparator: {
      fontSize: 14,
      fontWeight: '600',
    },
    removeButton: {
      padding: spacing.xs,
    },
  });

export default RequestSessionModal;

