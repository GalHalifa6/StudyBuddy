import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuestionDetails } from '../../api/types';
import { Palette } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';

interface QuestionCardProps {
  question: QuestionDetails;
  onPress: () => void;
  palette: Palette;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onPress, palette }) => {
  const answered = question.answered || Boolean(question.answer || (question.answers?.length ?? 0) > 0);
  const createdAt = question.createdAt ? new Date(question.createdAt).toLocaleDateString() : '';
  const tagList = question.tags ?? [];
  const answerSnippet = question.answer?.content ?? question.answers?.[0]?.content;
  const voteCount = (question as any).voteCount ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: answered ? palette.successLight : palette.border, backgroundColor: palette.surface },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.headerRow}>
        <View style={[styles.questionIcon, { backgroundColor: answered ? palette.successLight : palette.primaryLight }]}>
          <Ionicons
            name={answered ? 'checkmark-circle' : 'help-circle'}
            size={20}
            color={answered ? palette.success : palette.primary}
          />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
            {question.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={palette.textMuted} />
            <Text style={[styles.metaText, { color: palette.textMuted }]}>{createdAt}</Text>
            {question.course?.code ? (
              <>
                <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>
                <Ionicons name="book-outline" size={12} color={palette.textMuted} />
                <Text style={[styles.metaText, { color: palette.textMuted }]}>{question.course.code}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: answered ? palette.successLight : palette.surfaceAlt }]}>
          <Text style={[styles.statusLabel, { color: answered ? palette.success : palette.textSecondary }]}>
            {answered ? 'Answered' : 'Pending'}
          </Text>
        </View>
      </View>

      {question.content ? (
        <Text style={[styles.body, { color: palette.textSecondary }]} numberOfLines={2}>
          {question.content}
        </Text>
      ) : null}

      {answerSnippet ? (
        <View style={[styles.answerPreview, { backgroundColor: palette.surfaceAlt }]}>
          <Ionicons name="chatbubble-ellipses" size={14} color={palette.primary} />
          <Text style={[styles.answerText, { color: palette.textSecondary }]} numberOfLines={2}>
            {answerSnippet}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        {tagList.length ? (
          <View style={styles.tagsRow}>
            {tagList.slice(0, 2).map(tag => (
              <Text key={tag} style={[styles.tag, { backgroundColor: palette.primaryLight, color: palette.primary }]}>
                {tag}
              </Text>
            ))}
            {tagList.length > 2 ? (
              <Text style={[styles.moreTag, { color: palette.textSecondary }]}>{`+${tagList.length - 2}`}</Text>
            ) : null}
          </View>
        ) : <View />}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up" size={14} color={palette.textMuted} />
            <Text style={[styles.statText, { color: palette.textMuted }]}>{voteCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statText, { color: palette.textMuted }]}>{question.answers?.length ?? 0}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  questionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaDot: {
    fontSize: 10,
  },
  metaText: {
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 52,
  },
  answerPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginLeft: 52,
  },
  answerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 52,
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    fontSize: 11,
    fontWeight: '600',
  },
  moreTag: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default QuestionCard;
