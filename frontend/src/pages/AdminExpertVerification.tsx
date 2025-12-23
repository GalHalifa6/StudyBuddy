import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Shield,
  Search,
  Filter,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Ban,
  Loader2,
  Award,
  Clock,
} from 'lucide-react';

interface ExpertProfile {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  title: string;
  institution: string;
  bio: string;
  qualifications: string;
  yearsOfExperience: number;
  specializations: string[];
  skills: string[];
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  averageRating: number;
  totalRatings: number;
  totalSessions: number;
  totalQuestionsAnswered: number;
  weeklyAvailability: string | null;
  maxSessionsPerWeek: number;
  sessionDurationMinutes: number;
  acceptingNewStudents: boolean;
  offersGroupConsultations: boolean;
  offersOneOnOne: boolean;
  offersAsyncQA: boolean;
  typicalResponseHours: number;
  isAvailableNow: boolean;
  helpfulAnswers: number;
  studentsHelped: number;
  linkedInUrl: string | null;
  personalWebsite: string | null;
  createdAt: string;
  updatedAt: string | null;
  expertiseCourses: Array<{ id: number; code: string; name: string }>;
}

interface ExpertFilters {
  search: string;
  institution: string;
  specialization: string;
}

interface PaginatedResponse {
  content: ExpertProfile[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const AdminExpertVerification: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<ExpertFilters>({
    search: '',
    institution: '',
    specialization: '',
  });

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('size', '20');
      params.append('status', activeTab === 'pending' ? 'PENDING' : 'VERIFIED');

      if (filters.search) params.append('search', filters.search);
      if (filters.institution) params.append('institution', filters.institution);
      if (filters.specialization) params.append('specialization', filters.specialization);

      const response = await api.get<PaginatedResponse>(`/admin/experts?${params.toString()}`);
      setExperts(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setHasNext(response.data.hasNext);
      setHasPrevious(response.data.hasPrevious);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch experts');
      console.error('Error fetching experts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, filters]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchExperts();
  }, [isAdmin, navigate, fetchExperts]);

  useEffect(() => {
    setCurrentPage(0); // Reset to first page when tab changes
  }, [activeTab]);

  const handleFilterChange = (key: keyof ExpertFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      institution: '',
      specialization: '',
    });
    setCurrentPage(0);
  };

  const openProfileModal = async (expertId: number) => {
    try {
      const response = await api.get<ExpertProfile>(`/admin/experts/${expertId}`);
      setSelectedExpert(response.data);
      setShowProfileModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch expert details');
    }
  };

  const handleVerify = async () => {
    if (!selectedExpert) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/admin/experts/${selectedExpert.id}/verify`, { reason: reason || null });
      setShowVerifyModal(false);
      setReason('');
      setSuccessMessage('Expert verified successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchExperts();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to verify expert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpert || !reason.trim()) {
      setActionError('Reason is required for rejecting an expert');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/admin/experts/${selectedExpert.id}/reject`, { reason });
      setShowRejectModal(false);
      setReason('');
      setSuccessMessage('Expert rejected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchExperts();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to reject expert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedExpert || !reason.trim()) {
      setActionError('Reason is required for revoking verification');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/admin/experts/${selectedExpert.id}/revoke`, { reason });
      setShowRevokeModal(false);
      setReason('');
      setSuccessMessage('Expert verification revoked successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchExperts();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to revoke verification');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Award className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Expert Verification</h1>
                <p className="text-sm text-gray-500">Review and manage expert profile verifications</p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-5 h-5" />
                Pending Verification
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === 'verified'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Verified Experts
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Name, email, or bio..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                <input
                  type="text"
                  value={filters.institution}
                  onChange={(e) => handleFilterChange('institution', e.target.value)}
                  placeholder="Filter by institution..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  value={filters.specialization}
                  onChange={(e) => handleFilterChange('specialization', e.target.value)}
                  placeholder="Filter by specialization..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : experts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Award className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No {activeTab === 'pending' ? 'pending' : 'verified'} experts found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expert</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specializations</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied At</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {experts.map((expert) => (
                      <tr key={expert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{expert.fullName || expert.username}</p>
                            <p className="text-sm text-gray-500">{expert.email}</p>
                            {expert.title && (
                              <p className="text-xs text-gray-400">{expert.title}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {expert.institution || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {expert.specializations?.slice(0, 2).map((spec, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {spec}
                              </span>
                            ))}
                            {expert.specializations && expert.specializations.length > 2 && (
                              <span className="px-2 py-1 text-xs text-gray-500">
                                +{expert.specializations.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(expert.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openProfileModal(expert.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4 text-primary-600" />
                            </button>
                            {activeTab === 'pending' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedExpert(expert);
                                    setReason('');
                                    setActionError(null);
                                    setShowVerifyModal(true);
                                  }}
                                  className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Verify"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedExpert(expert);
                                    setReason('');
                                    setActionError(null);
                                    setShowRejectModal(true);
                                  }}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedExpert(expert);
                                  setReason('');
                                  setActionError(null);
                                  setShowRevokeModal(true);
                                }}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                title="Revoke Verification"
                              >
                                <Ban className="w-4 h-4 text-orange-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {experts.length > 0 ? currentPage * 20 + 1 : 0} to {Math.min((currentPage + 1) * 20, totalElements)} of {totalElements} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={!hasPrevious}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage + 1} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasNext}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Expert Profile</h2>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedExpert(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-gray-900">{selectedExpert.fullName || selectedExpert.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedExpert.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <p className="text-gray-900">{selectedExpert.title || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                    <p className="text-gray-900">{selectedExpert.institution || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <p className="text-gray-900">{selectedExpert.yearsOfExperience}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedExpert.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedExpert.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedExpert.qualifications || '-'}</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedExpert.bio || '-'}</p>
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedExpert.specializations?.map((spec, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedExpert.skills?.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expertise Courses */}
                {selectedExpert.expertiseCourses && selectedExpert.expertiseCourses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expertise Courses</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedExpert.expertiseCourses.map((course) => (
                        <span key={course.id} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {course.code} - {course.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedExpert.averageRating.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedExpert.totalSessions}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Questions Answered</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedExpert.totalQuestionsAnswered}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Students Helped</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedExpert.studentsHelped}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedExpert(null);
                }}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Verify Expert</h2>
              <button onClick={() => {
                setShowVerifyModal(false);
                setReason('');
                setActionError(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> This will verify the expert profile. Reason is optional.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for verification (optional)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{actionError}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setReason('');
                  setActionError(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Verify Expert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Reject Expert</h2>
              <button onClick={() => {
                setShowRejectModal(false);
                setReason('');
                setActionError(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will reject and deactivate the expert profile. Reason is required.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{actionError}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReason('');
                  setActionError(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !reason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Expert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Revoke Verification</h2>
              <button onClick={() => {
                setShowRevokeModal(false);
                setReason('');
                setActionError(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">
                  <strong>Warning:</strong> This will revoke the expert's verification status. Reason is required.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for revoking verification..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{actionError}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setReason('');
                  setActionError(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading || !reason.trim()}
                className="px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Revoke Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpertVerification;

