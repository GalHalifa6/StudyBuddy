import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionRequestService, SessionRequest } from '../api/experts';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  X,
  BookOpen,
} from 'lucide-react';

const SessionRequests: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [cancelRequestId, setCancelRequestId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await sessionRequestService.getMyRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load session requests:', error);
      showError('Failed to load session requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = (requestId: number) => {
    setCancelRequestId(requestId);
  };

  const confirmCancelRequest = async () => {
    if (!cancelRequestId) return;
    const requestId = cancelRequestId;
    setCancelRequestId(null);
    try {
      await sessionRequestService.cancelRequest(requestId);
      await loadRequests();
      showSuccess('Session request cancelled successfully');
    } catch (error: unknown) {
      console.error('Failed to cancel request:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : 'Failed to cancel request';
      showError(errorMessage || 'Failed to cancel request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: {
        bg: 'bg-yellow-100 text-yellow-700',
        text: 'Pending',
        icon: <Clock className="w-4 h-4" />,
      },
      APPROVED: {
        bg: 'bg-green-100 text-green-700',
        text: 'Approved',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      REJECTED: {
        bg: 'bg-red-100 text-red-700',
        text: 'Rejected',
        icon: <XCircle className="w-4 h-4" />,
      },
      COUNTER_PROPOSED: {
        bg: 'bg-blue-100 text-blue-700',
        text: 'Counter Proposed',
        icon: <ArrowLeftRight className="w-4 h-4" />,
      },
      CANCELLED: {
        bg: 'bg-gray-100 text-gray-700',
        text: 'Cancelled',
        icon: <X className="w-4 h-4" />,
      },
    };
    const config = statusColors[status] || statusColors.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const filteredRequests = filterStatus
    ? requests.filter((r) => r.status === filterStatus)
    : requests;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={cancelRequestId !== null}
        title="Cancel Session Request?"
        message="Are you sure you want to cancel this session request?"
        onConfirm={confirmCancelRequest}
        onCancel={() => setCancelRequestId(null)}
        confirmText="Cancel Request"
        cancelText="Keep Request"
        variant="default"
      />
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Session Requests</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage your session requests with experts</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === ''
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'PENDING'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({requests.filter((r) => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'APPROVED'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({requests.filter((r) => r.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilterStatus('COUNTER_PROPOSED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'COUNTER_PROPOSED'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Counter Proposed ({requests.filter((r) => r.status === 'COUNTER_PROPOSED').length})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.title}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {request.expert?.fullName || 'Expert'}
                    </span>
                    {request.course && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {request.course.code} - {request.course.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {request.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{request.description}</p>
                  )}
                  {request.agenda && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Agenda:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{request.agenda}</p>
                    </div>
                  )}
                  {request.preferredTimeSlots && request.preferredTimeSlots.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Preferred Time Slots:
                      </p>
                      <div className="space-y-1">
                        {request.preferredTimeSlots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="w-4 h-4" />
                            {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {request.chosenStart && request.chosenEnd && (
                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                        Scheduled Time:
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-300">
                        {new Date(request.chosenStart).toLocaleString()} -{' '}
                        {new Date(request.chosenEnd).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {request.expertResponseMessage && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                        Expert Response:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">{request.expertResponseMessage}</p>
                    </div>
                  )}
                  {request.rejectionReason && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{request.rejectionReason}</p>
                    </div>
                  )}
                  {request.createdSessionId && (
                    <div className="mt-3">
                      <button
                        onClick={() => navigate(`/session/${request.createdSessionId}`)}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View Session →
                      </button>
                    </div>
                  )}
                </div>
                {request.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancelRequest(request.id)}
                    className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No session requests found</p>
            <p className="text-sm mt-1">
              {filterStatus
                ? `No requests with status "${filterStatus}"`
                : 'You haven\'t requested any sessions yet'}
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default SessionRequests;

