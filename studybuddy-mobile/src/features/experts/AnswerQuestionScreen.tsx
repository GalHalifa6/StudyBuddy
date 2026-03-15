import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ExpertsStackParamList } from '../../navigation/types';
import { expertsApi } from '../../api/experts';
import { ExpertQuestionItem } from '../../api/types';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'ExpertAnswerQuestion'>;

 type FormValues = {
   answer: string;
 };

 const AnswerQuestionScreen: React.FC<Props> = ({ route, navigation }) => {
   const { questionId, questionTitle } = route.params;
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const { showToast } = useToast();
   const queryClient = useQueryClient();

   const { data: pendingQuestions } = useQuery({
     queryKey: ['experts', 'pending-questions'],
     queryFn: expertsApi.pendingQuestions,
   });

   const question: ExpertQuestionItem | undefined = pendingQuestions?.find(item => item.id === questionId);

   const { control, handleSubmit, reset } = useForm<FormValues>({
     defaultValues: {
       answer: '',
     },
   });

   const answerMutation = useMutation({
     mutationFn: (payload: FormValues) => expertsApi.answerQuestion(questionId, payload.answer.trim()),
     onSuccess: () => {
       showToast('Answer shared', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'pending-questions'] });
       queryClient.invalidateQueries({ queryKey: ['experts', 'dashboard'] });
       reset();
       navigation.goBack();
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

   const onSubmit = handleSubmit(values => {
     const trimmed = values.answer.trim();
     if (!trimmed) {
       showToast('Write a quick response before submitting', 'error');
       return;
     }
     answerMutation.mutate({ answer: trimmed });
   });

   return (
     <Screen scrollable={false}>
       <ScrollView contentContainerStyle={styles.container}>
         <View style={styles.header}>
           <Text style={[styles.heading, { color: colors.textPrimary }]}>
             {question?.title ?? questionTitle ?? 'Question'}
           </Text>
           <Text style={[styles.subheading, { color: colors.textSecondary }]}>
             {question?.student?.fullName ? `Asked by ${question.student.fullName}` : 'Student request'}
           </Text>
         </View>

         {question?.content ? (
           <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
             <Text style={[styles.cardBody, { color: colors.textPrimary }]}>{question.content}</Text>
             {question.tags?.length ? (
               <View style={styles.tagRow}>
                 {question.tags.map(tag => (
                   <Text key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt, color: colors.textSecondary }]}>
                     {tag}
                   </Text>
                 ))}
               </View>
             ) : null}
           </View>
         ) : null}

         <TextField
           control={control}
           name="answer"
           label="Your response"
           placeholder="Share context, resources, or the next step."
           multiline
           style={styles.textArea}
         />

         <Button
           label={answerMutation.isPending ? 'Sending…' : 'Send answer'}
           onPress={onSubmit}
           loading={answerMutation.isPending}
           disabled={answerMutation.isPending}
         />
       </ScrollView>
     </Screen>
   );
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
       fontSize: 24,
       fontWeight: '700',
     },
     subheading: {
       fontSize: 14,
     },
     card: {
       padding: spacing.lg,
       borderRadius: 18,
       borderWidth: 1,
       gap: spacing.md,
     },
     cardBody: {
       fontSize: typography.body,
       lineHeight: 20,
     },
     tagRow: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: spacing.xs,
     },
     tag: {
       paddingHorizontal: spacing.sm,
       paddingVertical: 4,
       borderRadius: 999,
       fontSize: 12,
       fontWeight: '600',
     },
     textArea: {
       minHeight: 200,
       textAlignVertical: 'top',
     },
   });

 export default AnswerQuestionScreen;
