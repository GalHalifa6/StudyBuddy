import React, { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { questionsApi } from '../../api/questions';
import { QuestionDetails } from '../../api/types';
import { ExpertsStackParamList } from '../../navigation/types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'QuestionDetails'>;

 const QuestionDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
   const { questionId } = route.params;
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const { showToast } = useToast();
   const queryClient = useQueryClient();

   const {
     data: question,
     isLoading,
     refetch,
     isRefetching,
   } = useQuery({
     queryKey: ['questions', 'detail', questionId],
     queryFn: () => questionsApi.byId(questionId),
   });

   useEffect(() => {
     if (question?.title) {
       navigation.setOptions({ title: question.title });
     }
   }, [navigation, question?.title]);

   // Track user's vote state locally
   const [userVoteState, setUserVoteState] = useState<{ hasVoted: boolean; voteType?: 'UPVOTE' | 'DOWNVOTE' }>({
     hasVoted: false,
   });

   // Update vote state when question loads
   useEffect(() => {
     // Initialize vote state - we'll track it from the API response
     // For now, assume no vote until we get response from upvote endpoint
   }, [question]);

   const upvoteMutation = useMutation({
     mutationFn: () => questionsApi.upvote(questionId),
     onSuccess: result => {
       // Update vote state from response
       const hasVoted = result.hasVoted ?? true;
       const voteType = result.voteType;
       setUserVoteState({ hasVoted, voteType });
       
       queryClient.setQueryData<QuestionDetails | undefined>(['questions', 'detail', questionId], prev =>
         prev ? { ...prev, upvotes: result.upvotes, netVotes: result.netVotes } : prev,
       );
       queryClient.invalidateQueries({ queryKey: ['questions', 'public'] });
       queryClient.invalidateQueries({ queryKey: ['questions', 'mine'] });
     },
     onError: error => {
       showToast(mapApiError(error).message, 'error');
     },
   });

   if (isLoading && !question) {
     return (
       <Screen>
         <View style={styles.loadingState}>
           <ActivityIndicator color={colors.primary} size="large" />
         </View>
       </Screen>
     );
   }

   if (!question) {
     return (
       <Screen>
         <View style={styles.errorState}>
           <Ionicons name="alert-circle" size={36} color={colors.error} />
           <Text style={styles.errorTitle}>We could not find that question.</Text>
           <Button label="Try again" onPress={() => refetch()} />
         </View>
       </Screen>
     );
   }
   const answers =
     question.answers ??
     (question.answer
       ? [
           {
             id: -question.id,
             content: question.answer.content,
             createdAt: question.answer.createdAt,
             answeredBy: question.answer.answeredBy,
           },
         ]
       : []);

   return (
     <Screen scrollable={false}>
       <ScrollView contentContainerStyle={styles.container}>
         <View style={styles.header}>
           <View style={styles.metaBadge}>
             <Ionicons name="time" size={14} color={colors.textSecondary} />
             <Text style={styles.metaText}>{new Date(question.createdAt).toLocaleString()}</Text>
           </View>
           <Text style={styles.title}>{question.title}</Text>
           <Text style={styles.contentBody}>{question.content}</Text>
           {question.tags?.length ? (
             <View style={styles.tagsRow}>
               {question.tags.map(tag => (
                 <Text key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt, color: colors.textSecondary }]}>
                   {tag}
                 </Text>
               ))}
             </View>
           ) : null}
           <View style={styles.upvoteRow}>
             <Text style={styles.voteCount}>{question.netVotes ?? question.upvotes ?? 0}</Text>
             <Text style={styles.voteLabel}>votes</Text>
             <Button
               label={
                 upvoteMutation.isPending 
                   ? 'Voting…' 
                   : userVoteState.hasVoted && userVoteState.voteType === 'UPVOTE'
                   ? 'Upvoted'
                   : 'Upvote'
               }
               onPress={() => upvoteMutation.mutate()}
               style={styles.voteButton}
               disabled={upvoteMutation.isPending || (userVoteState.hasVoted && userVoteState.voteType === 'UPVOTE')}
               variant={userVoteState.hasVoted && userVoteState.voteType === 'UPVOTE' ? 'primary' : 'secondary'}
             />
           </View>
         </View>

         <View style={styles.sectionHeader}>
           <Ionicons name="chatbubbles" size={18} color={colors.primary} />
           <Text style={styles.sectionTitle}>Answers</Text>
           {isRefetching ? <ActivityIndicator color={colors.primary} /> : null}
         </View>

         {answers.length ? (
           <View style={styles.answerStack}>
             {answers.map(answer => (
               <View key={answer.id} style={[styles.answerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
                 <View style={styles.answerHeader}>
                   <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                   <Text style={[styles.answerMeta, { color: colors.textSecondary }]}>
                     {answer.answeredBy?.fullName ?? 'Expert response'}
                   </Text>
                   <Text style={[styles.answerMeta, { color: colors.textMuted }]}>
                     {new Date(answer.createdAt).toLocaleString()}
                   </Text>
                 </View>
                 <Text style={[styles.answerBody, { color: colors.textPrimary }]}>{answer.content}</Text>
               </View>
             ))}
           </View>
         ) : (
           <View style={styles.emptyAnswers}>
             <Text style={styles.emptyAnswersTitle}>Waiting for an expert</Text>
             <Text style={styles.emptyAnswersBody}>
               We will nudge the right people and notify you once a response arrives.
             </Text>
           </View>
         )}
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
     loadingState: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
     },
     errorState: {
       gap: spacing.md,
       alignItems: 'flex-start',
     },
     errorTitle: {
       fontSize: typography.subheading,
       fontWeight: '600',
       color: colors.textPrimary,
     },
     header: {
       gap: spacing.sm,
     },
     metaBadge: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.xs,
     },
     metaText: {
       fontSize: 12,
       color: colors.textSecondary,
     },
     title: {
       fontSize: 26,
       fontWeight: '700',
       color: colors.textPrimary,
     },
     contentBody: {
       fontSize: typography.body,
       lineHeight: 22,
       color: colors.textPrimary,
     },
     tagsRow: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: spacing.xs,
     },
     tag: {
       paddingHorizontal: spacing.sm,
       paddingVertical: 4,
       borderRadius: 999,
       fontSize: 12,
       fontWeight: '500',
     },
     upvoteRow: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.sm,
       marginTop: spacing.sm,
     },
     voteCount: {
       fontSize: 20,
       fontWeight: '700',
       color: colors.textPrimary,
     },
     voteLabel: {
       fontSize: 12,
       color: colors.textSecondary,
       textTransform: 'uppercase',
       letterSpacing: 1,
     },
     voteButton: {
       width: 'auto',
       paddingHorizontal: spacing.lg,
     },
     sectionHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.sm,
     },
     sectionTitle: {
       fontSize: typography.subheading,
       fontWeight: '600',
       color: colors.textPrimary,
     },
     answerStack: {
       gap: spacing.md,
     },
     answerCard: {
       borderRadius: 16,
       borderWidth: 1,
       padding: spacing.lg,
       gap: spacing.sm,
     },
     answerHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.sm,
     },
     answerMeta: {
       fontSize: 13,
     },
     answerBody: {
       fontSize: typography.body,
       lineHeight: 20,
     },
     emptyAnswers: {
       padding: spacing.lg,
       borderRadius: 16,
       backgroundColor: colors.surface,
       borderWidth: 1,
       borderColor: colors.border,
       gap: spacing.xs,
     },
     emptyAnswersTitle: {
       fontSize: typography.subheading,
       fontWeight: '600',
       color: colors.textPrimary,
     },
     emptyAnswersBody: {
       fontSize: 14,
       color: colors.textSecondary,
     },
   });

 export default QuestionDetailsScreen;
