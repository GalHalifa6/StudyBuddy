import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, topicsService } from '../api';
import { API_BASE_URL } from '../config/api';
import { getProfile } from '../api/quiz';
import type { TopicsByCategoryResponse } from '../api/topics';
import {
  Save,
  Loader2,
  LinkIcon,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Brain,
  RefreshCw,
  TrendingUp,
  GraduationCap,
  Coffee,
  Palette,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [quizProfile, setQuizProfile] = useState<{
    quizStatus: string;
    reliabilityPercentage: number;
    message: string;
  } | null>(null);
  
  // Topics state
  const [allTopics, setAllTopics] = useState<TopicsByCategoryResponse | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(new Set());
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsChanged, setTopicsChanged] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isGoogleLinked = user?.googleSub != null && user.googleSub !== '';

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    setLinkError(null);

    try {
      const response = await authService.linkGoogleAccount();
      // The backend returns a relative URL, so we need to construct the full URL
      const fullOAuthUrl = response.oauthUrl.startsWith('http')
        ? response.oauthUrl
        : `${API_BASE_URL}${response.oauthUrl}`;
      
      // Redirect to Google OAuth with linking token
      window.location.href = fullOAuthUrl;
    } catch (error: unknown) {
      setIsLinkingGoogle(false);
      let errorMessage = 'Failed to initiate Google account linking. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; errors?: string[] } } };
        errorMessage = axiosError.response?.data?.message || 
                       axiosError.response?.data?.errors?.[0] ||
                       errorMessage;
      }
      setLinkError(errorMessage);
    }
  };

  useEffect(() => {
    loadQuizProfile();
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const [categorizedTopics, userTopics] = await Promise.all([
        topicsService.getTopicsByCategory(),
        topicsService.getMyTopics(),
      ]);
      
      setAllTopics(categorizedTopics);
      setSelectedTopicIds(new Set(userTopics.topics.map(t => t.id)));
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const loadQuizProfile = async () => {
    try {
      const profile = await getProfile();
      setQuizProfile({
        quizStatus: profile.quizStatus,
        reliabilityPercentage: profile.reliabilityPercentage,
        message: profile.message,
      });
    } catch (error) {
      console.error('Error loading quiz profile:', error);
    }
  };

  const toggleTopic = (topicId: number) => {
    const newSelected = new Set(selectedTopicIds);
    if (newSelected.has(topicId)) {
      newSelected.delete(topicId);
    } else {
      newSelected.add(topicId);
    }
    setSelectedTopicIds(newSelected);
    setTopicsChanged(true);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const saveTopics = async () => {
    setIsLoading(true);
    try {
      await topicsService.updateMyTopics(Array.from(selectedTopicIds));
      setTopicsChanged(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-100 mb-2">
            <Save className="h-4 w-4" />
            <span className="text-sm uppercase tracking-[0.2em]">Account Settings</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Settings</h1>
          <p className="text-indigo-100 max-w-xl leading-relaxed">
            Manage your profile and preferences
          </p>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-md shadow-gray-100/50 dark:shadow-gray-950/40">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold shadow-lg">
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user?.fullName || user?.username}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-950/20 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {selectedTopicIds.size}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Topics</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
              {user?.proficiencyLevel || 'N/A'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Level</p>
          </div>
        </div>
      </div>

      {/* Google Account Linking Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-md shadow-gray-100/50 dark:shadow-gray-950/40">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Connections</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Google Account</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isGoogleLinked 
                    ? 'Linked - You can sign in with Google' 
                    : 'Not linked - Sign in with password only'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isGoogleLinked ? (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Linked</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLinkingGoogle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Linking...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Link Account</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {linkError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Linking Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300">{linkError}</p>
              </div>
            </div>
          )}

          {!isGoogleLinked && (
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              Link your Google account to enable Google Sign-In. You'll still be able to sign in with your password.
            </p>
          )}
        </div>
      </div>
      {/* Quiz Profile Card */}
      {quizProfile && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-md shadow-gray-100/50 dark:shadow-gray-950/40">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-sm">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Learning Profile Quiz</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Helps match you with compatible study groups</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-950/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {quizProfile.quizStatus.replace('_', ' ')}
                </p>
              </div>
              <div className="p-5 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-950/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Reliability</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {Math.round(quizProfile.reliabilityPercentage * 100)}%
                </p>
              </div>
            </div>

            {quizProfile.quizStatus !== 'COMPLETED' && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {quizProfile.quizStatus === 'NOT_STARTED' 
                      ? 'Complete the quiz for better group matches!'
                      : quizProfile.quizStatus === 'SKIPPED'
                      ? 'Take the quiz to improve your recommendations'
                      : 'Complete more questions for better matches'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/quiz-onboarding')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              {quizProfile.quizStatus === 'NOT_STARTED' ? 'Take Quiz' : 'Retake Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Topics of Interest Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 shadow-md shadow-gray-100/50 dark:shadow-gray-950/40">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Topics of Interest</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select topics you're interested in or want to learn about
            </p>
          </div>
          {topicsChanged && (
            <button
              onClick={saveTopics}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Topics
                </>
              )}
            </button>
          )}
        </div>

        {success && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">Topics saved successfully!</span>
          </div>
        )}

        {isLoadingTopics ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          </div>
        ) : allTopics ? (
          <div className="space-y-4">
            {/* Education Topics */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <button
                onClick={() => toggleCategory('education')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950/20 hover:from-gray-100 hover:to-blue-100 dark:hover:from-gray-700 dark:hover:to-blue-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shadow-sm">
                    <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Education</h3>
                  <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                    ({allTopics.education.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('education') ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.has('education') && (
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {allTopics.education.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedTopicIds.has(topic.id)
                            ? 'bg-blue-500 text-white border-blue-600 shadow-md hover:bg-blue-600'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900'
                        }`}
                        title={topic.description}
                      >
                        {topic.name}
                        {selectedTopicIds.has(topic.id) && (
                          <CheckCircle2 className="w-3 h-3 inline-block ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Casual Topics */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-green-300 dark:hover:border-green-700 transition-colors">
              <button
                onClick={() => toggleCategory('casual')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-950/20 hover:from-gray-100 hover:to-green-100 dark:hover:from-gray-700 dark:hover:to-green-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shadow-sm">
                    <Coffee className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Casual & Career</h3>
                  <span className="text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                    ({allTopics.casual.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('casual') ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.has('casual') && (
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {allTopics.casual.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedTopicIds.has(topic.id)
                            ? 'bg-green-500 text-white border-green-600 shadow-md hover:bg-green-600'
                            : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900'
                        }`}
                        title={topic.description}
                      >
                        {topic.name}
                        {selectedTopicIds.has(topic.id) && (
                          <CheckCircle2 className="w-3 h-3 inline-block ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hobby Topics */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <button
                onClick={() => toggleCategory('hobby')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-950/20 hover:from-gray-100 hover:to-purple-100 dark:hover:from-gray-700 dark:hover:to-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shadow-sm">
                    <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Hobbies & Interests</h3>
                  <span className="text-sm font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                    ({allTopics.hobby.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('hobby') ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.has('hobby') && (
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {allTopics.hobby.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedTopicIds.has(topic.id)
                            ? 'bg-purple-500 text-white border-purple-600 shadow-md hover:bg-purple-600'
                            : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900'
                        }`}
                        title={topic.description}
                      >
                        {topic.name}
                        {selectedTopicIds.has(topic.id) && (
                          <CheckCircle2 className="w-3 h-3 inline-block ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedTopicIds.size > 0 && (
              <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-950/20 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Selected Topics ({selectedTopicIds.size}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedTopicIds).map((id) => {
                    const topic = [...(allTopics.education || []), ...(allTopics.casual || []), ...(allTopics.hobby || [])].find(t => t.id === id);
                    if (!topic) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium shadow-sm"
                      >
                        {topic.name}
                        <button
                          onClick={() => toggleTopic(id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Failed to load topics. Please refresh the page.
          </p>
        )}
      </div>
    </div>
  );
};

export default Settings;
