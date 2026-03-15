import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { questionsApi } from '../../api/questions';
import { QuestionDetails } from '../../api/types';
import QuestionCard from './QuestionCard';
import { ExpertsStackParamList } from '../../navigation/types';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'PublicQuestions'>;

 const MIN_SEARCH = 2;

 const PublicQuestionsScreen: React.FC<Props> = ({ navigation }) => {
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const [search, setSearch] = useState('');

   const {
     data: questions = [],
     isLoading,
     refetch,
     isRefetching,
   } = useQuery({
     queryKey: ['questions', 'public'],
     queryFn: questionsApi.public,
   });

   const filtered = useMemo(() => {
     const query = search.trim().toLowerCase();
     if (query.length < MIN_SEARCH) {
       return questions;
     }
     return questions.filter(question => {
       const haystack = [
         question.title,
         question.content,
         question.course?.name,
         question.course?.code,
         ...(question.tags ?? []),
       ]
         .filter(Boolean)
         .map(value => value!.toLowerCase());
       return haystack.some(value => value.includes(query));
     });
   }, [questions, search]);

   const handleSelect = (question: QuestionDetails) => {
     navigation.navigate('QuestionDetails', { questionId: question.id, title: question.title });
   };

   return (
     <Screen scrollable={false}>
       <View style={styles.container}>
         <View style={styles.header}>
           <Text style={styles.heading}>Community Q&A</Text>
           <Text style={styles.subheading}>Browse popular questions and learn from shared answers.</Text>
         </View>

         <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
           <TextInput
             value={search}
             onChangeText={setSearch}
             placeholder="Search community posts"
             placeholderTextColor={colors.textMuted}
             style={styles.searchInput}
             autoCapitalize="none"
             clearButtonMode="while-editing"
           />
         </View>

         {isLoading ? (
           <View style={styles.loadingState}>
             <ActivityIndicator color={colors.primary} size="large" />
           </View>
         ) : (
           <FlatList
             data={filtered}
             keyExtractor={item => item.id.toString()}
             renderItem={({ item }) => <QuestionCard question={item} onPress={() => handleSelect(item)} palette={colors} />}
             ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
             contentContainerStyle={filtered.length ? styles.listContent : styles.emptyWrap}
             refreshControl={
               <RefreshControl
                 refreshing={isRefetching}
                 onRefresh={refetch}
                 tintColor={colors.primary}
               />
             }
             ListEmptyComponent={
               <View style={styles.emptyState}>
                 <Text style={styles.emptyTitle}>No questions yet</Text>
                 <Text style={styles.emptyMessage}>
                   {search.trim().length >= MIN_SEARCH
                     ? 'Try a different keyword to explore community answers.'
                     : 'Be the first to ask something the community can collaborate on.'}
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
     searchWrap: {
       borderRadius: 16,
       paddingHorizontal: spacing.md,
       paddingVertical: spacing.sm,
     },
     searchInput: {
       fontSize: 16,
       color: colors.textPrimary,
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
       paddingHorizontal: spacing.lg,
     },
   });

 export default PublicQuestionsScreen;
