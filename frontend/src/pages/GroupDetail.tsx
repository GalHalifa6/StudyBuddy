import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupService } from '../api';
import { StudyGroup, GroupMemberStatus } from '../types';
import {
  ArrowLeft,
  Users,
  Loader2,
  Lock,
  UserPlus,
  Clock,
  Shield,
  Unlock,
  BookOpen,
} from 'lucide-react';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [memberStatus, setMemberStatus] = useState<GroupMemberStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchGroupData = async () => {
    try {
      const [groupData, status] = await Promise.all([
        groupService.getGroupById(parseInt(id!)),
        groupService.getMyStatus(parseInt(id!)),
      ]);
      setGroup(groupData);
      setMemberStatus(status);

      // If user is a member, redirect to MyGroups chat
      if (status.isMember) {
        navigate(`/my-groups?group=${id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!group || !id) return;

    if (group.visibility === 'private') {
      alert('This is a private group. Only the creator can invite members.');
      return;
    }

    setIsJoining(true);
    try {
      const result = await groupService.joinGroup(parseInt(id));
      if (result.status === 'PENDING') {
        alert(result.message);
        fetchGroupData();
      } else {
        // Successfully joined - redirect to chat
        navigate(`/my-groups?group=${id}`);
      }
    } catch (error: unknown) {
      console.error('Error joining group:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : 'Error joining group';
      alert(errorMessage || 'Error joining group');
    } finally {
      setIsJoining(false);
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
            <Lock className="w-4 h-4" />
            Private
          </span>
        );
      case 'approval':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            <Shield className="w-4 h-4" />
            Requires Approval
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
            <Unlock className="w-4 h-4" />
            Open to Join
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Group not found</h2>
        <Link to="/groups" className="text-indigo-600 hover:underline">
          ← Back to Groups
        </Link>
      </div>
    );
  }

  const isFull = (group.members?.length || 0) >= group.maxSize;
  const hasPendingRequest = memberStatus?.hasPendingRequest;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/groups"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Group Details</h1>
      </div>

      {/* Group Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-8 text-white">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg">
              {group.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold">{group.name}</h2>
                {getVisibilityBadge(group.visibility)}
              </div>
              {group.course && (
                <div className="flex items-center gap-2 text-indigo-100 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium">{group.course.code} - {group.course.name}</span>
                </div>
              )}
              {group.topic && (
                <p className="text-indigo-100 text-sm">Topic: {group.topic}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Description */}
          {group.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h3>
              <p className="text-gray-600 dark:text-gray-400">{group.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Members</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {group.members?.length || 0} / {group.maxSize}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {new Date(group.createdAt || '').toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Members Preview */}
          {group.members && group.members.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Members</h3>
              <div className="flex flex-wrap gap-2">
                {group.members.slice(0, 8).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      {member.fullName?.charAt(0) || member.username.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.fullName || member.username}
                    </span>
                  </div>
                ))}
                {group.members.length > 8 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-sm">
                    +{group.members.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {hasPendingRequest ? (
              <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Request Pending</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleJoinGroup}
                  disabled={isJoining || isFull || group.visibility === 'private'}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {isFull ? 'Group Full' : group.visibility === 'private' ? 'Private Group' : group.visibility === 'approval' ? 'Request to Join' : 'Join Group'}
                    </>
                  )}
                </button>
                <Link
                  to="/groups"
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  Back to Groups
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
