import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { ExpertsStackParamList } from '../../navigation/types';
import { SubmitExpertReviewRequest } from '../../api/types';
import { expertsApi } from '../../api/experts';
import { mapApiError } from '../../api/errors';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'SubmitExpertReview'>;

 type FormValues = {
   review: string;
   highlights: string;
   improvements: string;
   isAnonymous: boolean;
   isPublic: boolean;
 };

 const SubmitReviewScreen: React.FC<Props> = ({ navigation, route }) => {
   const { expertId, expertName } = route.params;
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const { showToast } = useToast();
   const queryClient = useQueryClient();
   const [rating, setRating] = useState(0);
   const [error, setError] = useState<string | null>(null);

   const {
     control,
     handleSubmit,
     reset,
     watch,
   } = useForm<FormValues>({
     defaultValues: {
       review: '',
       highlights: '',
       improvements: '',
       isAnonymous: false,
       isPublic: true,
     },
   });

   const submitMutation = useMutation({
     mutationFn: (payload: SubmitExpertReviewRequest) => expertsApi.submitReview(expertId, payload),
     onSuccess: () => {
       showToast('Thanks for sharing your feedback!', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'reviews', expertId] });
       queryClient.invalidateQueries({ queryKey: ['experts', 'profile', expertId] });
      queryClient.invalidateQueries({ queryKey: ['experts', 'review-eligibility', expertId] });
       reset();
       navigation.goBack();
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

   const onSubmit = handleSubmit(values => {
     const trimmedReview = values.review.trim();
     if (!rating) {
       setError('Select how strongly you recommend this expert');
       return;
     }
     if (!trimmedReview) {
       setError('Share a few words about your experience');
       return;
     }
     setError(null);

     const payload: SubmitExpertReviewRequest = {
       rating,
       review: trimmedReview,
       highlights: values.highlights.trim() || undefined,
       improvements: values.improvements.trim() || undefined,
       isAnonymous: values.isAnonymous,
       isPublic: values.isPublic,
     };

     submitMutation.mutate(payload);
   });

   const disableSubmit = !watch('review').trim().length || !rating || submitMutation.isPending;

   return (
     <Screen scrollable={false}>
       <ScrollView contentContainerStyle={styles.container}>
         <View style={styles.header}>
           <Text style={styles.heading}>Review your session</Text>
           <Text style={styles.subheading}>
             Let other learners know what it is like to work with {expertName ?? 'this expert'}.
           </Text>
         </View>

         <View style={styles.ratingRow}>
           {Array.from({ length: 5 }).map((_, index) => {
             const starIndex = index + 1;
             const active = rating >= starIndex;
             return (
               <Pressable
                 key={starIndex}
                 onPress={() => setRating(starIndex)}
                 accessibilityRole="button"
                 style={styles.starButton}
               >
                 <Ionicons
                   name={active ? 'star' : 'star-outline'}
                   size={32}
                   color={active ? colors.accent : colors.textMuted}
                 />
               </Pressable>
             );
           })}
         </View>
         <Text style={styles.ratingHint}>{rating ? `You rated ${rating} out of 5` : 'Tap a star to rate'}</Text>

         <TextField
           control={control}
           name="review"
           label="Share your experience"
           placeholder="How did this expert help you move forward?"
           multiline
           style={styles.textArea}
         />

         <TextField
           control={control}
           name="highlights"
           label="Highlights (optional)"
           placeholder="What stood out?"
           multiline
         />

         <TextField
           control={control}
           name="improvements"
           label="Suggestions (optional)"
           placeholder="Any ideas to make future sessions better?"
           multiline
         />

         <View style={styles.toggleGroup}>
           <Controller
             control={control}
             name="isAnonymous"
             render={({ field: { value, onChange } }) => (
               <ToggleRow
                 label="Post anonymously"
                 helper="Only the StudyBuddy team will see your name."
                 value={value}
                 onChange={onChange}
                 colors={colors}
               />
             )}
           />
           <Controller
             control={control}
             name="isPublic"
             render={({ field: { value, onChange } }) => (
               <ToggleRow
                 label="Share publicly"
                 helper="If disabled, only you and the expert will see this review."
                 value={value}
                 onChange={onChange}
                 colors={colors}
               />
             )}
           />
         </View>

         {error ? <Text style={styles.errorText}>{error}</Text> : null}

         <Button
           label={submitMutation.isPending ? 'Submitting…' : 'Submit review'}
           onPress={onSubmit}
           disabled={disableSubmit}
           loading={submitMutation.isPending}
         />
       </ScrollView>
     </Screen>
   );
 };

 const ToggleRow: React.FC<{
   label: string;
   helper: string;
   value: boolean;
   onChange: (next: boolean) => void;
   colors: Palette;
 }> = ({ label, helper, value, onChange, colors }) => (
   <View style={[toggleStyles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
     <View style={toggleStyles.copy}>
       <Text style={[toggleStyles.label, { color: colors.textPrimary }]}>{label}</Text>
       <Text style={[toggleStyles.helper, { color: colors.textSecondary }]}>{helper}</Text>
     </View>
     <Switch
       accessibilityRole="switch"
       value={value}
       onValueChange={onChange}
       trackColor={{ false: colors.border, true: colors.accent }}
       thumbColor={value ? colors.primary : colors.surface}
     />
   </View>
 );

 const createStyles = (colors: Palette) =>
   StyleSheet.create({
     container: {
       gap: spacing.lg,
       paddingBottom: spacing.xl,
     },
     header: {
       gap: spacing.xs,
     },
     heading: {
       fontSize: 26,
       fontWeight: '700',
       color: colors.textPrimary,
     },
     subheading: {
       fontSize: typography.body,
       color: colors.textSecondary,
       lineHeight: 20,
     },
     ratingRow: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.sm,
     },
     starButton: {
       padding: spacing.xs,
     },
     ratingHint: {
       fontSize: 13,
       color: colors.textSecondary,
     },
     textArea: {
       minHeight: 140,
       textAlignVertical: 'top',
     },
     toggleGroup: {
       gap: spacing.md,
       marginTop: spacing.sm,
     },
     errorText: {
       color: colors.error,
       fontSize: 13,
     },
   });

 const toggleStyles = StyleSheet.create({
   row: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     justifyContent: 'space-between',
     gap: spacing.md,
     borderRadius: 16,
     borderWidth: 1,
     padding: spacing.md,
   },
   copy: {
     flex: 1,
     gap: spacing.xs,
   },
   label: {
     fontSize: 15,
     fontWeight: '600',
   },
   helper: {
     fontSize: 13,
   },
 });

 export default SubmitReviewScreen;
