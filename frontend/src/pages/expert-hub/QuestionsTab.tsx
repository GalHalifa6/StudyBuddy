import {
  Search,
  User,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  HelpCircle,
  BookOpen,
  Loader2,
} from 'lucide-react';
import type { ExpertQuestion } from '../../api/experts';

interface QuestionsTabProps {
  filteredQuestions: ExpertQuestion[];
  questionView: 'public' | 'personal';
  onQuestionViewChange: (view: 'public' | 'personal') => void;
  personalQuestionsLoading: boolean;
  filterStatus: 'all' | 'answered' | 'unanswered';
  onFilterStatusChange: (status: 'all' | 'answered' | 'unanswered') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  expandedQuestion: number | null;
  onToggleExpand: (id: number | null) => void;
}

export default function QuestionsTab({
  filteredQuestions,
  questionView,
  onQuestionViewChange,
  personalQuestionsLoading,
  filterStatus,
  onFilterStatusChange,
  searchQuery,
  onSearchChange,
  expandedQuestion,
  onToggleExpand,
}: QuestionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Question View Toggle and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => onQuestionViewChange('public')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              questionView === 'public'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Community Q&A
          </button>
          <button
            onClick={() => onQuestionViewChange('personal')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              questionView === 'personal'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            My Questions
          </button>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all' || value === 'answered' || value === 'unanswered') {
              onFilterStatusChange(value);
            }
          }}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Questions</option>
          <option value="answered">Answered</option>
          <option value="unanswered">Unanswered</option>
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
        />
      </div>

      {/* Questions List */}
      {questionView === 'personal' && personalQuestionsLoading ? (
        <div className="card p-10 text-center text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          Loading your expert questions...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No questions found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {questionView === 'personal'
              ? 'Ask your first question to an expert'
              : 'Try adjusting your search or filters'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {question.title}
                    </h3>
                    {question.isUrgent && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                        Urgent
                      </span>
                    )}
                    {question.answer && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Answered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {question.content.substring(0, 200)}
                    {question.content.length > 200 && '...'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {question.expert?.fullName || 'Expert'}
                    </span>
                    {question.course && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {question.course.code}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {question.upvotes || 0}
                    </span>
                  </div>
                </div>
              </div>

              {expandedQuestion === question.id && question.answer && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/10 rounded-xl p-4">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Expert Answer
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {question.answer}
                      </p>
                      {question.answeredAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Answered on {new Date(question.answeredAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => onToggleExpand(expandedQuestion === question.id ? null : question.id)}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                {expandedQuestion === question.id ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {question.answer ? 'View answer' : 'View details'}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
