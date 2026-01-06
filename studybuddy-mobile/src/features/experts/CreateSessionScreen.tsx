import React, { useCallback, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { Palette, useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ExpertsStackParamList } from '../../navigation/types';
import { CreateExpertSessionRequest } from '../../api/types';
import { expertsApi } from '../../api/experts';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'ExpertCreateSession'>;

type FormValues = {
  title: string;
  description: string;
  sessionType: CreateExpertSessionRequest['sessionType'];
  startTime: Date | null;
  endTime: Date | null;
  meetingLink: string;
  meetingPlatform: string;
  maxParticipants: string;
};

type PickerField = 'startTime' | 'endTime';

type IosPickerState = {
  field: PickerField;
  date: Date;
};

const SESSION_TYPES: Array<{ value: CreateExpertSessionRequest['sessionType']; label: string }> = [
  { value: 'OFFICE_HOURS', label: 'Office hours' },
  { value: 'ONE_ON_ONE', label: '1:1' },
  { value: 'GROUP', label: 'Group session' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'Q_AND_A', label: 'Q&A' },
];

const CreateSessionScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const initialTimes = useMemo(() => buildInitialTimes(), []);
  const [iosPickerState, setIosPickerState] = useState<IosPickerState | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      sessionType: 'OFFICE_HOURS',
      startTime: initialTimes.start,
      endTime: initialTimes.end,
      meetingLink: '',
      meetingPlatform: 'Zoom',
      maxParticipants: '10',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateExpertSessionRequest) => expertsApi.createSession(payload),
    onSuccess: () => {
      showToast('Session scheduled', 'success');
      queryClient.invalidateQueries({ queryKey: ['experts', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['experts', 'my-sessions'] });
      navigation.goBack();
    },
    onError: error => {
      const errorMessage = mapApiError(error).message;
      Alert.alert(
        'Unable to Create Session',
        errorMessage.includes('conflict') 
          ? 'You already have a session scheduled at this time. Please choose a different time slot.'
          : errorMessage,
        [{ text: 'OK', style: 'default' }]
      );
    },
  });

  const onSubmit = handleSubmit(values => {
    if (!values.title.trim()) {
      Alert.alert('Missing Title', 'Please give your session a title.');
      return;
    }
    if (!values.startTime || !values.endTime) {
      Alert.alert('Missing Time', 'Please select both start and end times.');
      return;
    }

    const now = new Date();
    if (values.startTime.getTime() <= now.getTime()) {
      Alert.alert('Invalid Time', 'Start time must be in the future.');
      return;
    }

    if (values.endTime.getTime() <= values.startTime.getTime()) {
      Alert.alert('Invalid Time', 'End time must be after the start time.');
      return;
    }

    const payload: CreateExpertSessionRequest = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      sessionType: values.sessionType,
      scheduledStartTime: values.startTime.toISOString(),
      scheduledEndTime: values.endTime.toISOString(),
      meetingLink: values.meetingLink.trim() || undefined,
      meetingPlatform: values.meetingPlatform.trim() || undefined,
    };

    if (values.maxParticipants.trim()) {
      const parsed = Number(values.maxParticipants.trim());
      if (!Number.isNaN(parsed) && parsed > 0) {
        payload.maxParticipants = parsed;
      }
    }

    createMutation.mutate(payload);
  });

  const selectedType = watch('sessionType');
  const startValue = watch('startTime');
  const endValue = watch('endTime');

  const openPicker = useCallback(
    (field: PickerField) => {
      const current = getValues(field);
      const currentStart = getValues('startTime');
      const fallbackForField =
        field === 'endTime' && currentStart
          ? new Date(currentStart.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000)
          : field === 'startTime'
            ? initialTimes.start
            : initialTimes.end;
      const baseDate = current ?? fallbackForField ?? new Date();

      if (Platform.OS === 'ios') {
        setIosPickerState({ field, date: new Date(baseDate) });
        return;
      }

      const handleTimePicker = (dateWithDay: Date) => {
        DateTimePickerAndroid.open({
          value: dateWithDay,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, pickedTime) => {
            if (timeEvent.type !== 'set' || !pickedTime) {
              return;
            }
            const finalDate = mergeDateParts(dateWithDay, pickedTime, 'time');
            setValue(field, finalDate, { shouldDirty: true });
          },
        });
      };

      DateTimePickerAndroid.open({
        value: baseDate,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (dateEvent, pickedDate) => {
          if (dateEvent.type !== 'set' || !pickedDate) {
            return;
          }
          const withDate = mergeDateParts(current ?? baseDate, pickedDate, 'date');
          setValue(field, withDate, { shouldDirty: true });
          handleTimePicker(withDate);
        },
      });
    },
    [getValues, initialTimes.end, initialTimes.start, setValue],
  );

  const handleIosChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    if (!date) {
      return;
    }
    setIosPickerState(prev => (prev ? { ...prev, date } : prev));
  }, []);

  const confirmIosPicker = useCallback(() => {
    if (!iosPickerState) {
      return;
    }
    setValue(iosPickerState.field, new Date(iosPickerState.date), { shouldDirty: true });
    setIosPickerState(null);
  }, [iosPickerState, setValue]);

  const cancelIosPicker = useCallback(() => {
    setIosPickerState(null);
  }, []);

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Create a session</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Share when you are available and we will notify interested students.
          </Text>
        </View>

        <TextField control={control} name="title" label="Title" placeholder="Linear algebra office hours" />

        <TextField
          control={control}
          name="description"
          label="Description"
          placeholder="Let students know what you plan to cover."
          multiline
          style={styles.textArea}
        />

        <View style={styles.typeSelector}>
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Session type</Text>
          <View style={styles.typeRow}>
            {SESSION_TYPES.map(type => (
              <TypeChip
                key={type.value}
                label={type.label}
                active={selectedType === type.value}
                onPress={() => setValue('sessionType', type.value)}
              />
            ))}
          </View>
        </View>

        <ScheduleField label="Start time" value={startValue} onPress={() => openPicker('startTime')} colors={colors} />

        <ScheduleField label="End time" value={endValue} onPress={() => openPicker('endTime')} colors={colors} />

        <Text style={[styles.helper, { color: colors.textMuted }]}>Times use your local timezone.</Text>

        <TextField
          control={control}
          name="meetingLink"
          label="Meeting link"
          placeholder="https://meet.google.com/..."
          autoCapitalize="none"
        />

        <TextField control={control} name="meetingPlatform" label="Platform" placeholder="Zoom" />

        <TextField
          control={control}
          name="maxParticipants"
          label="Max participants"
          placeholder="10"
          keyboardType="number-pad"
        />

        <Button
          label={createMutation.isPending ? 'Scheduling…' : 'Create session'}
          onPress={onSubmit}
          loading={createMutation.isPending}
          disabled={createMutation.isPending}
        />

        {Platform.OS === 'ios' && (
          <Modal
            visible={iosPickerState != null}
            transparent
            animationType="slide"
            onRequestClose={cancelIosPicker}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}> 
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {iosPickerState?.field === 'endTime' ? 'Pick an end time' : 'Pick a start time'}
                </Text>
                {iosPickerState ? (
                  <DateTimePicker
                    value={iosPickerState.date}
                    mode="datetime"
                    display="inline"
                    minuteInterval={MINUTE_INTERVAL}
                    minimumDate={iosPickerState.field === 'startTime' ? new Date() : (startValue ?? new Date())}
                    onChange={handleIosChange}
                    style={styles.picker}
                  />
                ) : null}
                <View style={styles.modalActions}>
                  <Button label="Cancel" variant="secondary" onPress={cancelIosPicker} style={styles.modalButton} />
                  <Button label="Save" onPress={confirmIosPicker} style={styles.modalButton} />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </Screen>
  );
};

const TypeChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <Button
    label={label}
    onPress={onPress}
    variant={active ? 'primary' : 'secondary'}
    style={{
      width: 'auto',
      paddingHorizontal: spacing.lg,
      opacity: active ? 1 : 0.85,
    }}
  />
);

const scheduleStyles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  value: {
    fontSize: 16,
  },
});

const ScheduleField: React.FC<{
  label: string;
  value: Date | null;
  onPress: () => void;
  colors: Palette;
}> = ({ label, value, onPress, colors }) => (
  <View style={scheduleStyles.container}>
    <Text style={[scheduleStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        style={[scheduleStyles.button, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      >
        <Text style={[scheduleStyles.value, { color: value ? colors.textPrimary : colors.textMuted }]}>
          {value ? formatScheduleValue(value) : 'Select date & time'}
        </Text>
      </View>
    </TouchableOpacity>
  </View>
);

const DEFAULT_DURATION_MINUTES = 60;
const MINUTE_INTERVAL = 15;
const START_BUFFER_MINUTES = 30;

const buildInitialTimes = () => {
  const now = new Date();
  const buffered = new Date(now.getTime() + START_BUFFER_MINUTES * 60 * 1000);
  const start = roundToInterval(buffered, MINUTE_INTERVAL);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  return {
    start,
    end,
  };
};

const roundToInterval = (date: Date, intervalMinutes: number): Date => {
  const intervalMs = intervalMinutes * 60 * 1000;
  const rounded = new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
  rounded.setSeconds(0, 0);
  return rounded;
};

const mergeDateParts = (base: Date | null, incoming: Date, part: 'date' | 'time'): Date => {
  const next = new Date(base ?? incoming);
  if (part === 'date') {
    next.setFullYear(incoming.getFullYear(), incoming.getMonth(), incoming.getDate());
  } else {
    next.setHours(incoming.getHours(), incoming.getMinutes(), 0, 0);
  }
  next.setSeconds(0, 0);
  return next;
};

const formatScheduleValue = (value: Date): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(value);
  } catch (error) {
    return value.toLocaleString();
  }
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      gap: spacing.xs,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
    },
    subheading: {
      fontSize: typography.body,
      lineHeight: 20,
    },
    textArea: {
      minHeight: 140,
      textAlignVertical: 'top',
    },
    typeSelector: {
      gap: spacing.sm,
    },
    selectorLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    helper: {
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    modalButton: {
      flex: 1,
    },
    picker: {
      width: '100%',
    },
  });

export default CreateSessionScreen;
