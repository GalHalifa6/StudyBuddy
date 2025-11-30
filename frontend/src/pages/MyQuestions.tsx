import React, { useState, useEffect } from 'react';
import { studentExpertService, ExpertQuestion } from '../api/experts';
import {
  HelpCircle,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Eye,
  Tag,
  Code,
  User,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';

const MyQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await studentExpertService.getMyQuestions();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (questionId: number) => {
    try {
      await studentExpertService.markAnswerHelpful(questionId, true);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, isAnswerHelpful: true, isAnswerAccepted: true } : q
        )
      );
    } catch (error) {
      console.error('Failed to mark as helpful:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Answered':
      case 'Resolved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            {status}
          </span>
        );
      case 'Assigned':
      case 'In Progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
      case 'Open':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
            <AlertCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredQuestions = questions.filter((q) => {
    const isAnswered = q.status === 'Answered' || q.status === 'Resolved';
    const isPending = !isAnswered && q.status !== 'Closed';
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'answered' && isAnswered) ||
      (filterStatus === 'pending' && isPending);
    const matchesSearch = !searchQuery || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Questions</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View all your questions and expert answers
        </p>
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
              placeholder="Search your questions..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="all">All Questions</option>
              <option value="answered">Answered</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Questions</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {questions.filter((q) => q.status === 'Answered' || q.status === 'Resolved').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Answered</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {questions.filter((q) => q.status !== 'Answered' && q.status !== 'Resolved' && q.status !== 'Closed').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No questions found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : "You haven't asked any questions yet. Browse experts to ask your first question!"}
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              {/* Question Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getStatusBadge(question.status)}
                      {question.isUrgent && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                          Urgent
                        </span>
                      )}
                      {question.isPublic && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {question.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                      {question.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(question.createdAt)}
                      </span>
                      {question.expert && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          To: {question.expert.fullName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {question.viewCount} views
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedQuestion === question.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedQuestion === question.id && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {/* Full Question */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Question:
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
                            Code Snippet
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

                    {/* Tags */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-4">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-2">
                          {question.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Answer Section */}
                  {question.answer ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          Expert's Answer
                        </span>
                        {question.answeredBy && (
                          <span className="text-sm text-green-600 dark:text-green-500">
                            by {question.answeredBy.fullName}
                          </span>
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

                      {/* Feedback on answer */}
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center justify-between">
                        {question.isAnswerHelpful ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <ThumbsUp className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">You marked this answer as helpful</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkHelpful(question.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Mark as Helpful
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                          Awaiting answer from expert
                        </span>
                      </div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                        {question.expert
                          ? `${question.expert.fullName} will respond to your question soon.`
                          : 'Your question is being reviewed by our experts.'}
                      </p>
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

export default MyQuestions;
