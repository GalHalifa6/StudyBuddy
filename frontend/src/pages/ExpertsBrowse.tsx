import React, { useState, useEffect } from 'react';
import {
  studentExpertService,
  ExpertSearchResult,
  ExpertProfile,
  ExpertSession,
  AskQuestionRequest,
  CreateReviewRequest,
  ExpertReview,
} from '../api/experts';
import {
  Search,
  Star,
  MessageCircle,
  Users,
  CheckCircle,
  Filter,
  X,
  Send,
  User,
  Award,
  Calendar,
  Clock,
  Video,
  ExternalLink,
} from 'lucide-react';

const ExpertsBrowse: React.FC = () => {
  const [experts, setExperts] = useState<ExpertSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  
  // Expert detail modal
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [expertReviews, setExpertReviews] = useState<ExpertReview[]>([]);
  const [expertSessions, setExpertSessions] = useState<ExpertSession[]>([]);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertModalTab, setExpertModalTab] = useState<'about' | 'sessions' | 'reviews'>('about');
  
  // Ask question modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<AskQuestionRequest>>({
    title: '',
    content: '',
    isPublic: true,
    isUrgent: false,
  });
  
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState<Partial<CreateReviewRequest>>({
    rating: 5,
    review: '',
  });

  // Get all unique specializations
  const allSpecializations = [...new Set(experts.flatMap(e => e.specializations || []))];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const expertsData = await studentExpertService.getAllExperts();
      setExperts(expertsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const results = await studentExpertService.searchExperts(searchQuery);
        setExperts(results);
      } else {
        const results = await studentExpertService.getAllExperts();
        setExperts(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const openExpertProfile = async (expertUserId: number) => {
    try {
      const [profile, reviews, sessions] = await Promise.all([
        studentExpertService.getExpertProfile(expertUserId),
        studentExpertService.getExpertReviews(expertUserId),
        studentExpertService.getExpertSessions(expertUserId),
      ]);
      setSelectedExpert(profile);
      setExpertReviews(reviews);
      setExpertSessions(sessions);
      setExpertModalTab('about');
      setShowExpertModal(true);
    } catch (error) {
      console.error('Failed to load expert profile:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedExpert || !questionForm.title?.trim() || !questionForm.content?.trim()) return;
    try {
      await studentExpertService.askQuestion({
        ...questionForm as AskQuestionRequest,
        expertId: selectedExpert.userId,
      });
      setShowAskModal(false);
      setQuestionForm({ title: '', content: '', isPublic: true, isUrgent: false });
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedExpert || !reviewForm.review?.trim()) return;
    try {
      await studentExpertService.submitReview(selectedExpert.userId, {
        ...reviewForm as CreateReviewRequest,
      });
      setShowReviewModal(false);
      setReviewForm({ rating: 5, review: '' });
      // Refresh expert profile
      const profile = await studentExpertService.getExpertProfile(selectedExpert.userId);
      setSelectedExpert(profile);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (loading && experts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Browse Experts</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Connect with experts for guidance, Q&A, and learning sessions</p>
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search experts by name or expertise..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="">All Specializations</option>
              {allSpecializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <div className="pb-4 px-2 font-medium border-b-2 border-purple-600 text-purple-600 dark:text-purple-400">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Experts ({experts.length})
          </div>
        </div>
      </div>

      {/* Content - Expert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts.map((expert) => (
            <div
              key={expert.expertId}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openExpertProfile(expert.userId)}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {expert.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {expert.fullName}
                      </h3>
                      {expert.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{expert.title}</p>
                    {expert.institution && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{expert.institution}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{expert.averageRating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{expert.totalRatings} reviews</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {expert.specializations?.slice(0, 3).map((spec, i) => (
                    <span key={i} className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg text-xs">
                      {spec}
                    </span>
                  ))}
                  {expert.specializations && expert.specializations.length > 3 && (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg text-xs">
                      +{expert.specializations.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {expert.offersOneOnOne && (
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">1:1</span>
                    )}
                    {expert.offersAsyncQA && (
                      <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">Q&A</span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    expert.isAvailableNow
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {expert.isAvailableNow ? 'Available Now' : 'Schedule'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {experts.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No experts found</p>
              <p className="text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

      {/* Expert Profile Modal */}
      {showExpertModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <button
                onClick={() => setShowExpertModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold">
                  {selectedExpert.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">
                      {selectedExpert.fullName}
                    </h2>
                    {selectedExpert.isVerified && (
                      <CheckCircle className="w-5 h-5 text-blue-300" />
                    )}
                  </div>
                  <p className="text-purple-100">{selectedExpert.title}</p>
                  {selectedExpert.institution && (
                    <p className="text-purple-200 text-sm">{selectedExpert.institution}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      <span>{selectedExpert.averageRating?.toFixed(1) || '0.0'}</span>
                      <span className="text-purple-200">({selectedExpert.totalRatings} reviews)</span>
                    </div>
                    <span className="text-purple-200">•</span>
                    <span>{selectedExpert.totalSessions} sessions</span>
                    <span className="text-purple-200">•</span>
                    <span>{selectedExpert.yearsOfExperience || 0} years exp.</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedExpert.specializations?.map((spec, i) => (
                  <span key={i} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Modal Tabs */}
            <div className="bg-white border-b border-gray-100 px-6 pt-4">
              <div className="flex gap-6">
                <button
                  onClick={() => setExpertModalTab('about')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    expertModalTab === 'about' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setExpertModalTab('sessions')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    expertModalTab === 'sessions' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Sessions
                  </div>
                </button>
                <button
                  onClick={() => setExpertModalTab('reviews')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    expertModalTab === 'reviews' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Reviews ({expertReviews.length})
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* About Tab */}
              {expertModalTab === 'about' && (
                <div className="space-y-6">
                  {/* Bio */}
                  {selectedExpert.bio && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                      <p className="text-gray-600">{selectedExpert.bio}</p>
                    </div>
                  )}

                  {/* Qualifications */}
                  {selectedExpert.qualifications && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Qualifications</h3>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Award className="w-5 h-5 text-purple-600" />
                        <span>{selectedExpert.qualifications}</span>
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedExpert.skills && selectedExpert.skills.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedExpert.skills.map((skill, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedExpert.offersOneOnOne && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                          <User className="w-4 h-4" /> One-on-One Sessions
                        </span>
                      )}
                      {selectedExpert.offersGroupConsultations && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                          <Users className="w-4 h-4" /> Group Consultations
                        </span>
                      )}
                      {selectedExpert.offersAsyncQA && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" /> Async Q&A
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAskModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Ask a Question
                    </button>
                    <button
                      onClick={() => {
                        setReviewForm({ rating: 5, review: '' });
                        setShowReviewModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <Star className="w-5 h-5" />
                      Write a Review
                    </button>
                  </div>
                </div>
              )}

              {/* Sessions Tab */}
              {expertModalTab === 'sessions' && (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm mb-4">
                    View and book available sessions with {selectedExpert.fullName}
                  </p>
                  {expertSessions.length > 0 ? (
                    expertSessions.map((session) => (
                      <div key={session.id} className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-gray-900">{session.title}</span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                {session.sessionType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(session.scheduledStartTime).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {session.currentParticipants}/{session.maxParticipants}
                              </span>
                            </div>
                          </div>
                          {session.meetingLink && session.canJoin && (
                            <a
                              href={session.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No sessions scheduled</p>
                      <p className="text-sm mt-1">This expert hasn't scheduled any public sessions yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {expertModalTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-600 text-sm">
                      {expertReviews.length} review{expertReviews.length !== 1 ? 's' : ''} from students
                    </p>
                    <button
                      onClick={() => {
                        setReviewForm({ rating: 5, review: '' });
                        setShowReviewModal(true);
                      }}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + Write a Review
                    </button>
                  </div>
                  {expertReviews.length > 0 ? (
                    expertReviews.map((review) => (
                      <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium text-gray-900">
                              {review.isAnonymous ? 'Anonymous' : review.student?.fullName || 'Student'}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{review.review}</p>
                        {review.highlights && (
                          <p className="text-xs text-green-600 mt-2">✓ {review.highlights}</p>
                        )}
                        {review.expertResponse && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs text-purple-600 font-medium mb-1">Expert's response:</p>
                            <p className="text-sm text-gray-700">{review.expertResponse}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No reviews yet</p>
                      <p className="text-sm mt-1">Be the first to leave a review!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ask Question Modal */}
      {showAskModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Ask {selectedExpert.fullName}</h2>
              <button onClick={() => setShowAskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Title</label>
                <input
                  type="text"
                  value={questionForm.title || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                  placeholder="e.g., How do I implement authentication in React?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Details</label>
                <textarea
                  value={questionForm.content || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                  placeholder="Provide more details about your question..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="publicQuestion"
                    checked={questionForm.isPublic ?? true}
                    onChange={(e) => setQuestionForm({ ...questionForm, isPublic: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="publicQuestion" className="ml-2 text-sm text-gray-700">
                    Make answer public (helps others)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="urgentQuestion"
                    checked={questionForm.isUrgent ?? false}
                    onChange={(e) => setQuestionForm({ ...questionForm, isUrgent: e.target.checked })}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <label htmlFor="urgentQuestion" className="ml-2 text-sm text-gray-700">
                    Urgent
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAskModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAskQuestion}
                disabled={!questionForm.title?.trim() || !questionForm.content?.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Submit Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Review {selectedExpert.fullName}</h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (reviewForm.rating || 5)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-medium text-gray-700">{reviewForm.rating || 5}/5</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={reviewForm.review || ''}
                  onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                  placeholder="Share your experience with this expert..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Highlights (optional)</label>
                <input
                  type="text"
                  value={reviewForm.highlights || ''}
                  onChange={(e) => setReviewForm({ ...reviewForm, highlights: e.target.value })}
                  placeholder="What was the best part?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!reviewForm.review?.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Star className="w-4 h-4" />
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertsBrowse;
