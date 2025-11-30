import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  MessageCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Eye,
  Code,
  User,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

interface PublicQuestion {
  id: number;
  title: string;
  content: string;
  codeSnippet?: string;
  programmingLanguage?: string;
  status: string;
  tags?: string[];
  answer?: string;
  answeredAt?: string;
  answeredBy?: { id: number; fullName: string };
  expert?: { id: number; fullName: string };
  course?: { id: number; code: string; name: string };
  viewCount: number;
  upvotes: number;
  netVotes: number;
  createdAt: string;
  isAnonymous?: boolean;
  student?: { id: number; fullName: string };
}

const PublicQA: React.FC = () => {
  useAuth(); // For authenticated API calls
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'votes'>('recent');
  // Track which questions user has voted on
  const [userVotes, setUserVotes] = useState<{ [key: number]: 'UPVOTE' | 'DOWNVOTE' | null }>({});

  useEffect(() => {
    loadPublicQuestions();
  }, []);

  const loadPublicQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/questions/public', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Failed to load public questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (questionId: number) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, upvotes: result.upvotes, netVotes: result.netVotes } : q
          )
        );
        // Track user's vote state
        setUserVotes((prev) => ({
          ...prev,
          [questionId]: result.hasVoted ? result.voteType : null,
        }));
      }
    } catch (error) {
      console.error('Failed to upvote:', error);
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

  const filteredQuestions = questions
    .filter((q) => {
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'answered' && q.answer) ||
        (filterStatus === 'unanswered' && !q.answer);
      const matchesSearch =
        !searchQuery ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.viewCount - a.viewCount;
      if (sortBy === 'votes') return b.netVotes - a.netVotes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Public Q&A</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Browse questions and answers from the community
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, topics, or tags..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
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
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'votes')}
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

      {/* Questions Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No questions found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to ask a public question!'}
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Question Header */}
              <div className="p-4">
                <div className="flex gap-4">
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleUpvote(question.id)}
                      className={`p-2 rounded-lg transition-colors group ${
                        userVotes[question.id] === 'UPVOTE'
                          ? 'bg-purple-100 dark:bg-purple-900/50'
                          : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
                      }`}
                      title={userVotes[question.id] === 'UPVOTE' ? 'Click to remove vote' : 'Upvote this question'}
                    >
                      <ThumbsUp className={`w-5 h-5 ${
                        userVotes[question.id] === 'UPVOTE'
                          ? 'text-purple-600 fill-purple-600'
                          : 'text-gray-400 group-hover:text-purple-600'
                      }`} />
                    </button>
                    <span className={`font-bold ${
                      userVotes[question.id] === 'UPVOTE' ? 'text-purple-600' : 'text-gray-900 dark:text-white'
                    }`}>{question.netVotes}</span>
                    <span className="text-xs text-gray-500">votes</span>
                  </div>

                  {/* Answer Count */}
                  <div
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                      question.answer
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {question.answer ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <MessageCircle className="w-5 h-5" />
                    )}
                    <span className="text-xs font-medium">{question.answer ? 'Answered' : 'Pending'}</span>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                      }
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                        {question.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                        {question.content}
                      </p>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center flex-wrap gap-3 mt-3">
                      {/* Tags */}
                      {question.tags && question.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {question.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
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

                      {/* Course */}
                      {question.course && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          in {question.course.code}
                        </span>
                      )}

                      {/* Views */}
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Eye className="w-3 h-3" />
                        {question.viewCount}
                      </span>

                      {/* Date */}
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(question.createdAt)}
                      </span>

                      {/* Asked by */}
                      {!question.isAnonymous && question.student && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <User className="w-3 h-3" />
                          {question.student.fullName}
                        </span>
                      )}
                    </div>

                    {/* Expand/Collapse */}
                    <button
                      onClick={() =>
                        setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                      }
                      className="flex items-center gap-1 mt-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700"
                    >
                      {expandedQuestion === question.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          {question.answer ? 'View answer' : 'View details'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedQuestion === question.id && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {/* Full Question */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Question:
                    </h4>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {question.content}
                    </p>

                    {/* Code Snippet */}
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

                  {/* Answer Section */}
                  {question.answer ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          Expert Answer
                        </span>
                        {question.answeredBy && (
                          <Link
                            to={`/experts/${question.answeredBy.id}`}
                            className="text-sm text-green-600 dark:text-green-500 hover:underline"
                          >
                            by {question.answeredBy.fullName}
                          </Link>
                        )}
                        {question.answeredAt && (
                          <span className="text-xs text-green-500 dark:text-green-600 ml-auto">
                            {formatDate(question.answeredAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {question.answer}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                          Awaiting expert answer
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicQA;
