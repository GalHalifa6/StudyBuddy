import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '../../components/ui/Screen';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '../../api/courses';
import { groupApi } from '../../api/groups';
import { CreateGroupRequest } from '../../api/types';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { GroupsStackParamList } from '../../navigation/types';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';

const schema = z.object({
  name: z.string().min(3, 'Group name is required'),
  description: z.string().optional(),
  topic: z.string().optional(),
  maxSize: z
    .string()
    .min(1, 'Group size is required')
    .refine(value => /^[0-9]+$/.test(value), 'Group size must be a number')
    .refine(value => {
      const size = Number(value);
      return size >= 2 && size <= 50;
    }, 'Group size must be between 2 and 50'),
});

const VISIBILITY_OPTIONS: Array<{ value: 'open' | 'approval' | 'private'; label: string; helper: string }> = [
  {
    value: 'open',
    label: 'Open join',
    helper: 'Any enrolled student can join instantly.',
  },
  {
    value: 'approval',
    label: 'Approval required',
    helper: 'Students request to join and you approve.',
  },
  {
    value: 'private',
    label: 'Invite only',
    helper: 'Only invited members can join.',
  },
];

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<GroupsStackParamList, 'CreateGroup'>;

const CreateGroupScreen: React.FC<Props> = ({ navigation, route }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [visibility, setVisibility] = useState<'open' | 'approval' | 'private'>('open');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(route.params?.courseId ?? null);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: myCourses,
    isLoading: loadingCourses,
  } = useQuery({
    queryKey: ['courses', 'my'],
    queryFn: courseApi.getMyCourses,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      topic: '',
      maxSize: '10',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateGroupRequest) => groupApi.create(payload),
    onSuccess: group => {
      showToast('Group created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigation.replace('GroupDetails', { groupId: group.id });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!selectedCourseId) {
      Alert.alert('Select a course', 'Choose a course so classmates can find your group.');
      return;
    }

    const payload: CreateGroupRequest = {
      name: values.name,
      description: values.description ?? undefined,
      topic: values.topic ?? undefined,
      maxSize: parseInt(values.maxSize, 10),
      visibility,
      course: { id: selectedCourseId },
    };

    createMutation.mutate(payload);
  };

  const courseChips = useMemo(() => myCourses ?? [], [myCourses]);
  const selectedCourse = useMemo(
    () => courseChips.find(course => course.id === selectedCourseId) ?? null,
    [courseChips, selectedCourseId],
  );

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Create a new study group</Text>
        <Text style={styles.subheading}>
          Pick the course, set the vibe, and invite classmates. Collaboration starts here.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course</Text>
          {loadingCourses ? (
            <Text style={styles.helper}>Loading your enrolled courses…</Text>
          ) : courseChips.length ? (
            <View style={styles.chipWrap}>
              {courseChips.map(course => {
                const isActive = course.id === selectedCourseId;
                return (
                  <Pressable
                    key={course.id}
                    style={[styles.chip, isActive ? styles.chipActive : null]}
                    onPress={() => setSelectedCourseId(course.id)}
                  >
                    <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>{course.code}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helper}>You need to enroll in a course before creating a group.</Text>
          )}
          {selectedCourse ? (
            <Text style={styles.helper}>
              Selected course: {selectedCourse.name ?? selectedCourse.code}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <TextField label="Group name" name="name" control={control} error={errors.name?.message} />
          <TextField label="Topic" name="topic" control={control} error={errors.topic?.message} />
          <TextField
            label="Description"
            name="description"
            control={control}
            error={errors.description?.message}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <TextField label="Max members" name="maxSize" control={control} error={errors.maxSize?.message} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={styles.visibilityWrap}>
            {VISIBILITY_OPTIONS.map(option => {
              const isActive = visibility === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.visibilityCard, isActive ? styles.visibilityActive : null]}
                  onPress={() => setVisibility(option.value)}
                >
                  <Text style={[styles.visibilityLabel, isActive ? styles.visibilityLabelActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helper}>{VISIBILITY_OPTIONS.find(opt => opt.value === visibility)?.helper}</Text>
        </View>

        <Button label="Create group" onPress={handleSubmit(onSubmit)} loading={createMutation.isPending} />
      </ScrollView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  helper: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.surface,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  visibilityWrap: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  visibilityCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  visibilityActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  visibilityLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  visibilityLabelActive: {
    color: colors.primary,
  },
  });

export default CreateGroupScreen;
