import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuiz, submitQuiz, skipQuiz, QuizQuestion } from '../api/quiz';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Loader2, 
  SkipForward, 
  AlertCircle,
  Brain,
  Users,
  TrendingUp,
  Target
} from 'lucide-react';

const QuizOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      const quizData = await getQuiz();
      // Sort by orderIndex
      const sortedQuestions = quizData.sort((a, b) => a.orderIndex - b.orderIndex);
      setQuestions(sortedQuestions);
    } catch (err) {
      setError('Failed to load quiz questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 
    ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) 
    : 0;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  const handleSelectOption = (optionId: number) => {
    if (!currentQuestion) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: optionId
    }));
    setError(null);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (answeredCount === 0) {
      setError('Please answer at least one question before submitting, or click "Skip Quiz" to skip.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitQuiz({ answers });
      setSuccessMessage(response.message);
      
      // Navigate to dashboard after showing success message
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!confirm('Are you sure you want to skip the quiz? This will limit group matching recommendations.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await skipQuiz();
      setSuccessMessage(response.message);
      
      // Navigate to dashboard after showing success message
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to skip quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompletionMessage = useCallback(() => {
    if (answeredCount === 0) return 'No questions answered yet';
    if (answeredCount === totalQuestions) return 'All questions answered! 100% profile reliability';
    
    const percentage = Math.round((answeredCount / totalQuestions) * 100);
    return `${answeredCount}/${totalQuestions} answered (${percentage}% profile reliability)`;
  }, [answeredCount, totalQuestions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Questions Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There are no quiz questions available at this time. Please contact support.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200 sm:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-primary-600 shadow-sm dark:bg-gray-800 dark:text-primary-300 mb-4">
            <Brain className="h-4 w-4" />
            Learning Style Quiz
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Discover Your Study Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Answer these questions to help us understand your learning preferences and match you with compatible study groups.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Progress Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-xl bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </p>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Completion</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="mt-4 rounded-xl bg-primary-50 p-3 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <p className="font-semibold mb-1">Profile Reliability</p>
                <p>{getCompletionMessage()}</p>
              </div>
            </div>

            {/* Info Cards */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-4">
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>Helps match you with compatible study partners</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>More answers = Better recommendations</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <SkipForward className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span>You can skip or answer partially</span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="space-y-6">
            {currentQuestion && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {/* Question */}
                <div className="mb-8">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300 text-sm font-medium mb-4">
                    Question {currentQuestionIndex + 1}/{totalQuestions}
                  </span>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {currentQuestion.questionText}
                  </h2>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((option) => {
                      const isSelected = answers[currentQuestion.questionId] === option.optionId;
                      return (
                        <button
                          key={option.optionId}
                          onClick={() => handleSelectOption(option.optionId)}
                          className={`w-full text-left rounded-xl border-2 px-6 py-4 transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-md'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium flex-1">{option.optionText}</span>
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={isFirstQuestion || isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-3">
                    {!isLastQuestion ? (
                      <button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-secondary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Complete Quiz
                            <CheckCircle className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Skip Button */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || answeredCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Submit Partial Quiz
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip Quiz
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Submit now with {answeredCount} answer{answeredCount !== 1 ? 's' : ''} or skip to do later
              </p>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can retake this quiz from Settings anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizOnboarding;
