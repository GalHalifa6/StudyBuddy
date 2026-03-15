import {
  Search,
  Star,
  MessageCircle,
  Users,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { ExpertSearchResult } from '../../api/experts';

interface ExpertsTabProps {
  filteredExperts: ExpertSearchResult[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSpecialization: string;
  onSpecializationChange: (spec: string) => void;
  allSpecializations: string[];
  profileLoadingId: number | null;
  onViewProfile: (expertUserId: number) => void;
}

export default function ExpertsTab({
  filteredExperts,
  searchQuery,
  onSearchChange,
  selectedSpecialization,
  onSpecializationChange,
  allSpecializations,
  profileLoadingId,
  onViewProfile,
}: ExpertsTabProps) {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search experts by name, title, or expertise..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={selectedSpecialization}
          onChange={(e) => onSpecializationChange(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
        >
          <option value="">All Specializations</option>
          {allSpecializations.map((spec) => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
      </div>

      {/* Experts Grid */}
      {filteredExperts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No experts found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperts.map((expert) => (
            <div key={expert.userId} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                  {expert.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {expert.fullName}
                  </h3>
                  {expert.title && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {expert.title}
                    </p>
                  )}
                  {expert.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {expert.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {expert.bio}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{expert.averageRating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-xs">({(expert as { totalReviews?: number }).totalReviews || 0})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{(expert as { totalQuestions?: number }).totalQuestions || 0} Q&A</span>
                </div>
              </div>

              {expert.specializations && expert.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {expert.specializations.slice(0, 3).map((spec) => (
                    <span key={spec} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => onViewProfile(expert.userId)}
                disabled={profileLoadingId === expert.userId}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {profileLoadingId === expert.userId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading profile...
                  </>
                ) : (
                  'View Profile'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
