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
  Calendar,
  Loader2,
  FileText,
} from 'lucide-react';

interface AuditLog {
  id: number;
  adminUserId: number;
  actionType: string;
  targetType: string;
  targetId: number;
  reason: string | null;
  metadata: string | null;
  createdAt: string;
}

interface AuditLogFilters {
  actionType: string;
  targetType: string;
  adminUserId: string;
  targetId: string;
  fromDate: string;
  toDate: string;
  search: string;
}

interface PaginatedResponse {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const AdminAuditLogs: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<AuditLogFilters>({
    actionType: '',
    targetType: '',
    adminUserId: '',
    targetId: '',
    fromDate: '',
    toDate: '',
    search: '',
  });

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('size', '20');

      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.targetType) params.append('targetType', filters.targetType);
      if (filters.adminUserId) params.append('adminUserId', filters.adminUserId);
      if (filters.targetId) params.append('targetId', filters.targetId);
      // Send datetime-local format directly (backend will handle conversion)
      if (filters.fromDate) {
        params.append('fromDate', filters.fromDate);
      }
      if (filters.toDate) {
        params.append('toDate', filters.toDate);
      }
      if (filters.search) params.append('search', filters.search);

      const response = await api.get<PaginatedResponse>(`/admin/audit-logs?${params.toString()}`);
      setLogs(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setHasNext(response.data.hasNext);
      setHasPrevious(response.data.hasPrevious);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAuditLogs();
  }, [isAdmin, navigate, fetchAuditLogs]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      targetType: '',
      adminUserId: '',
      targetId: '',
      fromDate: '',
      toDate: '',
      search: '',
    });
    setCurrentPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatMetadata = (metadata: string | null): string => {
    if (!metadata) return 'No metadata';
    try {
      const parsed = JSON.parse(metadata);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return metadata;
    }
  };

  const openMetadataModal = (metadata: string | null) => {
    setSelectedMetadata(formatMetadata(metadata));
    setShowMetadataModal(true);
  };

  const actionTypeOptions = [
    'SUSPEND', 'UNSUSPEND', 'BAN', 'UNBAN', 'SOFT_DELETE', 'RESTORE', 'PERMANENT_DELETE',
    'ROLE_CHANGE', 'DISABLE_LOGIN', 'ENABLE_LOGIN', 'COURSE_UPDATE', 'COURSE_ARCHIVE',
    'COURSE_UNARCHIVE', 'COURSE_DELETE', 'COURSE_REMOVE_MEMBER', 'GROUP_DELETE'
  ];

  const targetTypeOptions = ['USER', 'COURSE', 'GROUP'];

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
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-sm text-gray-500">View all admin actions and system changes</p>
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

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                <select
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Actions</option>
                  {actionTypeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Type</label>
                <select
                  value={filters.targetType}
                  onChange={(e) => handleFilterChange('targetType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Types</option>
                  {targetTypeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin User ID</label>
                <input
                  type="number"
                  value={filters.adminUserId}
                  onChange={(e) => handleFilterChange('adminUserId', e.target.value)}
                  placeholder="Filter by admin ID"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target ID</label>
                <input
                  type="number"
                  value={filters.targetId}
                  onChange={(e) => handleFilterChange('targetId', e.target.value)}
                  placeholder="Filter by target ID"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="datetime-local"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="datetime-local"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search (Reason/Metadata)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search in reason or metadata..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
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
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin User ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.targetType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.targetId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.adminUserId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {log.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.metadata ? (
                            <button
                              onClick={() => openMetadataModal(log.metadata)}
                              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {logs.length > 0 ? currentPage * 20 + 1 : 0} to {Math.min((currentPage + 1) * 20, totalElements)} of {totalElements} results
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

      {/* Metadata Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Metadata</h2>
              <button
                onClick={() => setShowMetadataModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <pre className="bg-gray-50 p-4 rounded-xl text-sm overflow-x-auto">
                {selectedMetadata}
              </pre>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;

