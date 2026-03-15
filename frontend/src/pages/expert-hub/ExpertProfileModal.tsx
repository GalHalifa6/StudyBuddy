import {
  ArrowRight,
  Star,
  MessageCircle,
  Users,
  X,
  Clock,
  ExternalLink,
  Shield,
  Calendar,
  Video,
} from 'lucide-react';
import type { ExpertProfile, ExpertReview, ExpertSession } from '../../api/experts';

interface ExpertProfileModalProps {
  expert: ExpertProfile;
  reviews: ExpertReview[];
  sessions: ExpertSession[];
  activeTab: 'about' | 'sessions' | 'reviews';
  onTabChange: (tab: 'about' | 'sessions' | 'reviews') => void;
  onClose: () => void;
  onAskQuestion: () => void;
  onWriteReview: () => void;
  onNavigate: (path: string) => void;
  formatDateTime: (dateStr: string) => string;
}

export default function ExpertProfileModal({
  expert,
  reviews,
  sessions,
  activeTab,
  onTabChange,
  onClose,
  onAskQuestion,
  onWriteReview,
  onNavigate,
  formatDateTime,
}: ExpertProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expert Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Expert Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
              {expert.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {expert.fullName}
                  </h3>
                  {expert.title && (
                    <p className="text-lg text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                      {expert.title}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold">{expert.averageRating?.toFixed(1) || 'N/A'}</span>
                      <span className="text-gray-500">({(expert as { totalReviews?: number }).totalReviews || 0} reviews)</span>
                    </div>
                    {expert.isVerified && (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Shield className="w-4 h-4" />
                        Verified Expert
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onAskQuestion}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Ask Question
            </button>
            <button
              onClick={() => onTabChange('sessions')}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              View Sessions
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex gap-6">
            {(['about', 'sessions', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`py-4 font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {expert.bio && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">About</h4>
                  <p className="text-gray-600 dark:text-gray-400">{expert.bio}</p>
                </div>
              )}

              {expert.specializations && expert.specializations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {expert.specializations.map((spec) => (
                      <span key={spec} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {expert.yearsOfExperience && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Experience</h4>
                  <p className="text-gray-600 dark:text-gray-400">{expert.yearsOfExperience} years</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View upcoming sessions from {expert.fullName} or jump to the full sessions hub for more filters.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('/sessions')}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Open sessions hub
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {sessions.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No upcoming sessions scheduled
                </p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-primary">{session.sessionType.replace(/_/g, ' ')}</span>
                      <span className={`badge ${session.status === 'In Progress'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {session.status}
                      </span>
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      {session.title}
                    </h5>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(session.scheduledStartTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.currentParticipants} / {session.maxParticipants}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {session.canJoin ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(`/session/${session.id}`)}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
                        >
                          <Video className="w-4 h-4" />
                          Open Session
                        </button>
                      ) : null}
                      {session.meetingLink && (
                        <a
                          href={session.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Link
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Reviews</h4>
                <button
                  onClick={onWriteReview}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Write Review
                </button>
              </div>
              {reviews.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No reviews yet
                </p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{review.review}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
