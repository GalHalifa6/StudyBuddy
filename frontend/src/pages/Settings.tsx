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
  Clock,
  MessageSquare,
  CheckCircle,
  Link as LinkIcon,
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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
  
  const [formData, setFormData] = useState({
    proficiencyLevel: user?.proficiencyLevel || 'intermediate',
    preferredLanguages: user?.preferredLanguages?.join(', ') || '',
    availability: user?.availability || '',
    collaborationStyle: user?.collaborationStyle || 'balanced',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);

    try {
      await authService.updateProfile({
        topicsOfInterest: [], // Deprecated, now using topics table
        proficiencyLevel: formData.proficiencyLevel,
        preferredLanguages: formData.preferredLanguages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        availability: formData.availability,
        collaborationStyle: formData.collaborationStyle,
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="avatar avatar-lg">
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user?.fullName || user?.username}
            </h2>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {selectedTopicIds.size}
            </p>
            <p className="text-sm text-gray-500">Topics</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {user?.proficiencyLevel || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">Level</p>
          </div>
        </div>
      </div>

      {/* Google Account Linking Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account Connections</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Google Account</p>
                <p className="text-sm text-gray-500">
                  {isGoogleLinked 
                    ? 'Linked - You can sign in with Google' 
                    : 'Not linked - Sign in with password only'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isGoogleLinked ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Linked</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className="btn-secondary flex items-center gap-2"
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
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-1">Linking Failed</p>
                <p className="text-sm">{linkError}</p>
              </div>
            </div>
          )}

          {!isGoogleLinked && (
            <p className="text-sm text-gray-500">
              Link your Google account to enable Google Sign-In. You'll still be able to sign in with your password.
            </p>
          )}
        </div>
      </div>
      {/* Quiz Profile Card */}
      {quizProfile && (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Learning Profile Quiz</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Helps match you with compatible study groups</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {quizProfile.quizStatus.replace('_', ' ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reliability</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.round(quizProfile.reliabilityPercentage * 100)}%
                </p>
              </div>
            </div>

            {quizProfile.quizStatus !== 'COMPLETED' && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
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
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              {quizProfile.quizStatus === 'NOT_STARTED' ? 'Take Quiz' : 'Retake Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Topics of Interest Section */}
      <div className="card p-6">
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
              className="btn-primary flex items-center gap-2"
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
          <div className="flex items-center gap-2 p-4 mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            <span>Topics saved successfully!</span>
          </div>
        )}

        {isLoadingTopics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : allTopics ? (
          <div className="space-y-3">
            {/* Education Topics */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory('education')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Education</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({allTopics.education.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('education') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
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
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory('casual')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Casual & Career</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({allTopics.casual.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('casual') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
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
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory('hobby')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Hobbies & Interests</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({allTopics.hobby.filter(t => selectedTopicIds.has(t.id)).length} selected)
                  </span>
                </div>
                {expandedCategories.has('hobby') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
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
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Topics ({selectedTopicIds.size}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedTopicIds).map((id) => {
                    const topic = [...(allTopics.education || []), ...(allTopics.casual || []), ...(allTopics.hobby || [])].find(t => t.id === id);
                    if (!topic) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm"
                      >
                        {topic.name}
                        <button
                          onClick={() => toggleTopic(id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
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

      {/* Preferences Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Learning Preferences</h2>

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proficiency Level
          </label>
          <select
            value={formData.proficiencyLevel}
            onChange={(e) =>
              setFormData({ ...formData, proficiencyLevel: e.target.value })
            }
            className="input"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Languages
          </label>
          <input
            type="text"
            value={formData.preferredLanguages}
            onChange={(e) =>
              setFormData({ ...formData, preferredLanguages: e.target.value })
            }
            className="input"
            placeholder="e.g., English, Spanish"
          />
          <p className="text-xs text-gray-500 mt-1">Separate languages with commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline-block mr-2" />
            Collaboration Style
          </label>
          <select
            value={formData.collaborationStyle}
            onChange={(e) =>
              setFormData({ ...formData, collaborationStyle: e.target.value })
            }
            className="input"
          >
            <option value="quiet_focus">Quiet Focus - Prefer async communication</option>
            <option value="balanced">Balanced - Mix of sync and async</option>
            <option value="discussion_heavy">Discussion Heavy - Love live discussions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline-block mr-2" />
            Availability
          </label>
          <textarea
            value={formData.availability}
            onChange={(e) =>
              setFormData({ ...formData, availability: e.target.value })
            }
            className="input min-h-[100px] resize-none"
            placeholder="e.g., Weekdays 6pm-9pm, Weekends 10am-2pm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Settings;
