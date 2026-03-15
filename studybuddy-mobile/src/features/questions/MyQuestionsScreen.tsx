import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { questionsApi } from '../../api/questions';
import QuestionCard from './QuestionCard';
import { QuestionDetails } from '../../api/types';
import { ExpertsStackParamList } from '../../navigation/types';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'MyQuestions'>;

 const MyQuestionsScreen: React.FC<Props> = ({ navigation }) => {
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);

   const {
     data: questions = [],
     isLoading,
     refetch,
     isRefetching,
   } = useQuery({
     queryKey: ['questions', 'mine'],
     queryFn: questionsApi.mine,
   });

   const handleSelect = (question: QuestionDetails) => {
     navigation.navigate('QuestionDetails', { questionId: question.id, title: question.title });
   };

   return (
     <Screen scrollable={false}>
       <View style={styles.container}>
         <View style={styles.header}>
           <Text style={styles.heading}>My questions</Text>
           <Text style={styles.subheading}>Track the questions you have sent to experts and follow up on their answers.</Text>
         </View>

        <Button
          label="Ask another question"
          onPress={() => navigation.navigate('AskQuestion')}
          style={styles.askButton}
          variant="secondary"
        />

         {isLoading ? (
           <View style={styles.loadingState}>
             <ActivityIndicator color={colors.primary} size="large" />
           </View>
         ) : (
           <FlatList
             data={questions}
             keyExtractor={item => item.id.toString()}
             renderItem={({ item }) => <QuestionCard question={item} onPress={() => handleSelect(item)} palette={colors} />}
             ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
             contentContainerStyle={questions.length ? styles.listContent : styles.emptyWrap}
             refreshControl={
               <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
             }
             ListEmptyComponent={
               <View style={styles.emptyState}>
                 <Text style={styles.emptyTitle}>You have not asked anything yet</Text>
                 <Text style={styles.emptyMessage}>
                   Reach out to an expert whenever you get stuck and we will ping you once they respond.
                 </Text>
               </View>
             }
           />
         )}
       </View>
     </Screen>
   );
 };

 const createStyles = (colors: Palette) =>
   StyleSheet.create({
     container: {
       flex: 1,
       paddingBottom: spacing.xl,
       gap: spacing.lg,
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
     askButton: {
       alignSelf: 'flex-start',
       width: 'auto',
     },
     loadingState: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
     },
     listContent: {
       gap: spacing.md,
       paddingBottom: spacing.xl,
     },
     emptyWrap: {
       flexGrow: 1,
       justifyContent: 'center',
       paddingVertical: spacing.xl,
     },
     emptyState: {
       alignItems: 'center',
       gap: spacing.sm,
       paddingHorizontal: spacing.lg,
     },
     emptyTitle: {
       fontSize: typography.subheading,
       fontWeight: '600',
       color: colors.textPrimary,
     },
     emptyMessage: {
       fontSize: 14,
       color: colors.textSecondary,
       textAlign: 'center',
     },
   });

 export default MyQuestionsScreen;
