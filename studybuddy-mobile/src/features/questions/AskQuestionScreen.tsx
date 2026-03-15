import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useToast } from '../../components/ui/ToastProvider';
import { questionsApi } from '../../api/questions';
import { AskQuestionRequest } from '../../api/types';
import { mapApiError } from '../../api/errors';
import { ExpertsStackParamList } from '../../navigation/types';

 type Props = NativeStackScreenProps<ExpertsStackParamList, 'AskQuestion'>;

 type FormValues = {
   title: string;
   content: string;
   tags: string;
   isPublic: boolean;
   isAnonymous: boolean;
 };

 const parseTags = (input: string) =>
   input
     .split(',')
     .map(tag => tag.trim())
     .filter(Boolean);

 const AskQuestionScreen: React.FC<Props> = ({ navigation, route }) => {
   const expertId = route.params?.expertId;
   const expertName = route.params?.expertName;
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const { showToast } = useToast();
   const queryClient = useQueryClient();
   const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});

   const {
     control,
     handleSubmit,
     reset,
     watch,
   } = useForm<FormValues>({
     defaultValues: {
       title: '',
       content: '',
       tags: '',
       isPublic: true,
       isAnonymous: false,
     },
   });

   const askQuestionMutation = useMutation({
     mutationFn: (payload: AskQuestionRequest) => questionsApi.ask(payload),
     onSuccess: question => {
       showToast('Question submitted', 'success');
       queryClient.invalidateQueries({ queryKey: ['questions', 'mine'] });
       queryClient.invalidateQueries({ queryKey: ['questions', 'public'] });
       reset();
       navigation.replace('QuestionDetails', { questionId: question.id, title: question.title });
     },
     onError: error => {
       showToast(mapApiError(error).message, 'error');
     },
   });

   const onSubmit = handleSubmit(values => {
     const trimmedTitle = values.title.trim();
     const trimmedContent = values.content.trim();

     const errors: { title?: string; content?: string } = {};
     if (!trimmedTitle) {
       errors.title = 'Give your question a title';
     }
     if (!trimmedContent) {
       errors.content = 'Share a bit more detail so experts can help';
     }

     setFieldErrors(errors);

     if (Object.keys(errors).length) {
       return;
     }

     const payload: AskQuestionRequest = {
       title: trimmedTitle,
       content: trimmedContent,
       tags: parseTags(values.tags),
       isPublic: values.isPublic,
       isAnonymous: values.isAnonymous,
     };

     if (expertId) {
       payload.expertId = expertId;
     }

     askQuestionMutation.mutate(payload);
   });

   const watched = watch();
   const isSubmitDisabled = !watched.title.trim() || !watched.content.trim() || askQuestionMutation.isPending;

   return (
     <Screen scrollable={false}>
       <ScrollView contentContainerStyle={styles.container}>
         <View style={styles.header}>
           <Text style={styles.heading}>Ask an expert</Text>
          <Text style={styles.subheading}>
            {expertName
              ? `Your question will be sent directly to ${expertName}. You can choose to make it public (visible to all) or private (only ${expertName} can see it).`
              : 'Get help from the StudyBuddy expert community. Questions can be public (all experts can answer) or private (only visible to you and the answering expert).'}
          </Text>
         </View>

         <TextField
           control={control}
           name="title"
           label="Question title"
           placeholder="How can I improve my proof for..."
           error={fieldErrors.title}
           autoCapitalize="sentences"
         />

         <TextField
           control={control}
           name="content"
           label="Details"
           placeholder="Provide context, constraints, or what you have tried so far."
           error={fieldErrors.content}
           multiline
           style={styles.textArea}
         />

         <TextField
           control={control}
           name="tags"
           label="Tags"
           placeholder="Algorithms, Dynamic Programming"
           autoCapitalize="none"
         />
         <Text style={styles.helper}>Separate tags with commas to help others find your question.</Text>

         <View style={styles.toggleGroup}>
           <Controller
             control={control}
             name="isPublic"
             render={({ field: { value, onChange } }) => (
               <ToggleRow
                 label="Share with the community"
                 helper={
                   expertId
                     ? "If public, your question appears in community Q&A for all experts to see. If private, only the selected expert can see it."
                     : "Public questions appear in the community Q&A for all experts to answer. Private questions are only visible to you and the expert who answers."
                 }
                 value={value}
                 onChange={onChange}
                 colors={colors}
               />
             )}
           />
           <Controller
             control={control}
             name="isAnonymous"
             render={({ field: { value, onChange } }) => (
               <ToggleRow
                 label="Ask anonymously"
                 helper="Experts will see your question without your name."
                 value={value}
                 onChange={onChange}
                 colors={colors}
               />
             )}
           />
         </View>

         <Button
           label={askQuestionMutation.isPending ? 'Sending…' : 'Submit question'}
           onPress={onSubmit}
           disabled={isSubmitDisabled}
           loading={askQuestionMutation.isPending}
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
     textArea: {
       minHeight: 160,
       textAlignVertical: 'top',
     },
     helper: {
       fontSize: 12,
       color: colors.textMuted,
       marginTop: -spacing.sm,
     },
     toggleGroup: {
       gap: spacing.md,
       marginTop: spacing.sm,
     },
   });

 const toggleStyles = StyleSheet.create({
   row: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     justifyContent: 'space-between',
     gap: spacing.md,
     padding: spacing.md,
     borderRadius: 16,
     borderWidth: 1,
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

 export default AskQuestionScreen;
