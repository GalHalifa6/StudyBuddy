import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { questionService } from '../api/questions';
import type { ExpertQuestion } from '../api/experts';
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Eye,
  Filter,
  HelpCircle,
  Loader2,
  MessageCircle,
  Search,
  ThumbsUp,
  TrendingUp,
  User,
} from 'lucide-react';

type QuestionTab = 'public' | 'personal';

type QuestionsMode = 'all' | 'public' | 'personal';

type QuestionsProps = {
  initialTab?: QuestionTab;
  mode?: QuestionsMode;
};

type VoteState = Record<number, 'UPVOTE' | 'DOWNVOTE' | null>;

const Questions: React.FC<QuestionsProps> = ({ initialTab = 'public', mode = 'all' }) => {
  const { user } = useAuth();
  const allowedTabs = useMemo<QuestionTab[]>(() => {
    const tabs: QuestionTab[] = [];
    if (mode !== 'personal') {
      tabs.push('public');
    }
    if (mode !== 'public') {
      tabs.push('personal');
    }
    return tabs.length > 0 ? tabs : ['public'];
  }, [mode]);

  const defaultTab = useMemo<QuestionTab>(() => {
    const candidate = initialTab ?? 'public';
    return allowedTabs.includes(candidate) ? candidate : allowedTabs[0];
  }, [initialTab, allowedTabs]);

  const [activeTab, setActiveTab] = useState<QuestionTab>(defaultTab);
  const [publicQuestions, setPublicQuestions] = useState<ExpertQuestion[]>([]);
  const [personalQuestions, setPersonalQuestions] = useState<ExpertQuestion[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'votes'>('recent');
  const [userVotes, setUserVotes] = useState<VoteState>({});
  const [error, setError] = useState<string | null>(null);

  const loadPublicQuestions = useCallback(async () => {
    setLoadingPublic(true);
    setError(null);
    try {
      const data = await questionService.getPublicQuestions();
      setPublicQuestions(data);
    } catch (err) {
      console.error('Failed to load public questions:', err);
      setError('We could not load the community questions. Please try again in a moment.');
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  const loadPersonalQuestions = useCallback(async () => {
    setLoadingPersonal(true);
    setError(null);
    try {
      const data = await questionService.getMyQuestions();
      setPersonalQuestions(data);
    } catch (err) {
      console.error('Failed to load personal questions:', err);
      setError('We could not load your submitted questions. Please try again in a moment.');
    } finally {
      setLoadingPersonal(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (allowedTabs.includes('public')) {
      loadPublicQuestions();
    }
  }, [allowedTabs, loadPublicQuestions]);

  useEffect(() => {
    if (initialTab === 'personal' && allowedTabs.includes('personal')) {
      loadPersonalQuestions();
    }
  }, [initialTab, allowedTabs, loadPersonalQuestions]);

  useEffect(() => {
    if (
      activeTab === 'personal' &&
      allowedTabs.includes('personal') &&
      personalQuestions.length === 0 &&
      !loadingPersonal
    ) {
      loadPersonalQuestions();
    }
  }, [activeTab, allowedTabs, personalQuestions.length, loadingPersonal, loadPersonalQuestions]);

  useEffect(() => {
    setExpandedQuestion(null);
  }, [activeTab]);

  const isLoading = activeTab === 'public' ? loadingPublic : loadingPersonal;

  const filteredQuestions = useMemo(() => {
    const base = activeTab === 'public' ? publicQuestions : personalQuestions;
    const searchLower = searchQuery.trim().toLowerCase();

    return base
      .filter((question) => {
        const hasAnswer = Boolean(question.answer && question.answer.trim().length > 0);
        if (filterStatus === 'answered' && !hasAnswer) return false;
        if (filterStatus === 'unanswered' && hasAnswer) return false;

        if (!searchLower) {
          return true;
        }

        const searchable = [
          question.title,
          question.content,
          question.course?.code,
          question.course?.name,
          ...(question.tags ?? []),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());

        return searchable.some((value) => value.includes(searchLower));
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        }
        if (sortBy === 'votes') {
          return (b.netVotes ?? 0) - (a.netVotes ?? 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [activeTab, publicQuestions, personalQuestions, filterStatus, searchQuery, sortBy]);

  const handleUpvote = async (questionId: number) => {
    try {
      const result = await questionService.upvoteQuestion(questionId);
      const applyVoteUpdate = (items: ExpertQuestion[]) =>
        items.map((item) =>
          item.id === questionId
            ? { ...item, upvotes: result.upvotes, netVotes: result.netVotes }
            : item
        );

      setPublicQuestions((prev) => applyVoteUpdate(prev));
      setPersonalQuestions((prev) => applyVoteUpdate(prev));

      setUserVotes((prev) => ({
        ...prev,
        [questionId]: result.hasVoted ? result.voteType ?? 'UPVOTE' : null,
      }));
    } catch (err) {
      console.error('Failed to upvote question:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const currentTotal = filteredQuestions.length;
  const activeTabLabel = activeTab === 'public' ? 'Community Forum' : 'My Questions';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Questions &amp; Answers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Switch between the public forum and the private questions you have submitted.
          </p>
        </div>
        <Link
          to="/experts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          Ask an Expert
        </Link>
      </div>

      {allowedTabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'public' as QuestionTab, label: 'Community Forum', description: 'Public questions' },
            { key: 'personal' as QuestionTab, label: 'My Questions', description: 'Asked by you' },
          ]
            .filter((tab) => allowedTabs.includes(tab.key))
            .map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
                <span className="text-xs opacity-75">{tab.description}</span>
              </button>
            )))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
                className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
              >
                <option value="all">All</option>
                <option value="answered">Answered</option>
                <option value="unanswered">Unanswered</option>
              </select>
            </div>
            <div className="relative">
              <TrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Viewed</option>
                <option value="votes">Most Voted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          {currentTotal} question{currentTotal === 1 ? '' : 's'} in {activeTabLabel}
        </p>
        {user && activeTab === 'personal' && (
          <p className="text-xs text-gray-400">Signed in as {user.fullName ?? user.username}</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No questions found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search or filters.'
              : activeTab === 'public'
              ? 'Be the first to ask a question for the community.'
              : 'You have not submitted any questions yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => {
            const hasAnswer = Boolean(question.answer && question.answer.trim().length > 0);
            const isExpanded = expandedQuestion === question.id;
            const voteState = userVotes[question.id] ?? null;

            return (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleUpvote(question.id)}
                        className={`p-2 rounded-lg transition-colors group ${
                          voteState === 'UPVOTE'
                            ? 'bg-purple-100 dark:bg-purple-900/50'
                            : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
                        }`}
                        title={voteState === 'UPVOTE' ? 'Click to remove vote' : 'Upvote this question'}
                      >
                        <ThumbsUp
                          className={`w-5 h-5 ${
                            voteState === 'UPVOTE'
                              ? 'text-purple-600 fill-purple-600'
                              : 'text-gray-400 group-hover:text-purple-600'
                          }`}
                        />
                      </button>
                      <span
                        className={`font-bold ${
                          voteState === 'UPVOTE' ? 'text-purple-600' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {question.netVotes ?? question.upvotes ?? 0}
                      </span>
                      <span className="text-xs text-gray-500">votes</span>
                    </div>

                    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                      hasAnswer
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {hasAnswer ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <MessageCircle className="w-5 h-5" />
                      )}
                      <span className="text-xs font-medium">{hasAnswer ? 'Answered' : 'Pending'}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                          {question.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                          {question.content}
                        </p>
                      </div>

                      <div className="flex items-center flex-wrap gap-3 mt-3">
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {question.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {question.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{question.tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        {question.course && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            in {question.course.code}
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Eye className="w-3 h-3" />
                          {question.viewCount ?? 0}
                        </span>

                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(question.createdAt)}
                        </span>

                        {!question.isAnonymous && question.student && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <User className="w-3 h-3" />
                            {question.student.fullName ?? question.student.username}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                        className="flex items-center gap-1 mt-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            {hasAnswer ? 'View answer' : 'View details'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question:</h4>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{question.content}</p>

                      {question.codeSnippet && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Code
                              {question.programmingLanguage && (
                                <span className="text-gray-500"> ({question.programmingLanguage})</span>
                              )}
                            </span>
                          </div>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{question.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {hasAnswer ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="font-semibold text-green-700 dark:text-green-400">Expert Answer</span>
                          {question.answeredBy && (
                            <Link
                              to={`/experts/${question.answeredBy.id}`}
                              className="text-sm text-green-600 dark:text-green-500 hover:underline"
                            >
                              by {question.answeredBy.fullName}
                            </Link>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{question.answer}</p>
                        {question.answeredAt && (
                          <p className="text-xs text-green-700 dark:text-green-300 mt-3">
                            Answered {formatDate(question.answeredAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-sm">
                        No answer yet. We will notify you as soon as an expert responds.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Questions;
