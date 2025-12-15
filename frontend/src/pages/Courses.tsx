import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { courseService } from '../api';
import { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  Loader2,
  MinusCircle,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const Courses: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const initialView = viewParam === 'my' ? 'enrolled' : 'browse';
  const [activeView, setActiveView] = useState<'browse' | 'enrolled'>(initialView);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    description: '',
    faculty: '',
    semester: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [processingCourseId, setProcessingCourseId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCourses = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const [allCourses, enrolledCourses] = await Promise.all([
        courseService.getAllCourses(),
        courseService.getMyCourses(),
      ]);

      const enrolledIds = new Set(enrolledCourses.map((course) => course.id));
      setEnrolledCourseIds(enrolledIds);

      setCourses(
        allCourses.map((course) => ({
          ...course,
          enrolled: enrolledIds.has(course.id) || course.enrolled,
        }))
      );
      setMyCourses(enrolledCourses.map((course) => ({ ...course, enrolled: true })));
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    const nextView: 'browse' | 'enrolled' = viewParam === 'my' ? 'enrolled' : 'browse';
    setActiveView((current) => (current === nextView ? current : nextView));
  }, [viewParam]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const filteredAllCourses = useMemo(() => {
    if (!searchQuery.trim()) {
      return courses;
    }
    const query = searchQuery.trim().toLowerCase();
    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  const filteredMyCourses = useMemo(() => {
    if (!searchQuery.trim()) {
      return myCourses;
    }
    const query = searchQuery.trim().toLowerCase();
    return myCourses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query)
    );
  }, [myCourses, searchQuery]);

  const displayedCourses = activeView === 'browse' ? filteredAllCourses : filteredMyCourses;

  const switchView = (view: 'browse' | 'enrolled') => {
    setActiveView(view);
    const nextParams = new URLSearchParams(searchParams);
    if (view === 'enrolled') {
      nextParams.set('view', 'my');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleEnroll = async (courseId: number) => {
    setProcessingCourseId(courseId);
    try {
      await courseService.enrollInCourse(courseId);
      await loadCourses(false);
      setFeedback({ type: 'success', message: 'Enrolled! We added the course to your personal hub.' });
      switchView('enrolled');
    } catch (error) {
      setFeedback({ type: 'error', message: 'Could not enroll in that course right now. Please try again.' });
    } finally {
      setProcessingCourseId(null);
    }
  };

  const handleUnenroll = async (courseId: number) => {
    setProcessingCourseId(courseId);
    try {
      await courseService.unenrollFromCourse(courseId);
      await loadCourses(false);
      setFeedback({ type: 'success', message: 'Course removed. You can re-enroll from the catalog any time.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'We could not update your enrollment. Please try again.' });
    } finally {
      setProcessingCourseId(null);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await courseService.createCourse(newCourse);
      await loadCourses(false);
      setShowCreateModal(false);
      setNewCourse({ code: '', name: '', description: '', faculty: '', semester: '' });
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <Sparkles className="h-4 w-4" />
            Smarter Course Catalog
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">Find the right course, faster</h1>
          <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">
            Compare offerings, enroll with one click, and keep your active courses a tab away.
            Use the toggle below to jump between the full catalog and your personal enrollments.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-primary-100 px-4 py-3 text-center text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            <p className="text-2xl font-semibold">{courses.length}</p>
            <p className="text-xs uppercase tracking-wide">Active courses</p>
          </div>
          <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <p className="text-2xl font-semibold">{myCourses.length}</p>
            <p className="text-xs uppercase tracking-wide">My enrollments</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeView === 'browse' ? 'Search catalog by course name or code...' : 'Search within your enrolled courses...'}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input pl-12"
            />
          </div>
          <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => switchView('browse')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors ${
                activeView === 'browse'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => switchView('enrolled')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors ${
                activeView === 'enrolled'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              My courses
            </button>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add course
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* Courses Grid */}
      {displayedCourses.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {searchQuery ? 'No courses match your search' : activeView === 'browse' ? 'No courses yet' : 'No enrollments yet'}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your keywords or filters.'
              : activeView === 'browse'
                ? isAdmin
                  ? 'Be the first to publish a course for the community.'
                  : 'Check back soon or ask an administrator to add new courses.'
                : 'You have not enrolled in any courses. Switch to the catalog to get started.'}
          </p>
          {!searchQuery && isAdmin && activeView === 'browse' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add course
            </button>
          )}
          {activeView === 'enrolled' && (
            <button
              onClick={() => switchView('browse')}
              className="btn-secondary mt-6 inline-flex items-center gap-2"
            >
              Browse catalog
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayedCourses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id) || course.enrolled;
            const isProcessing = processingCourseId === course.id;

            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="card-hover flex h-full flex-col justify-between gap-6 p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 text-xl font-bold text-white">
                        {course.code.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge-primary">{course.semester || 'Current'}</span>
                          {isEnrolled && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle className="h-3 w-3" />
                              Enrolled
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {course.description || 'No description provided yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="inline-flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.code}</span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.groupCount ?? 0} study groups</span>
                    </div>
                    {course.faculty && (
                      <div className="inline-flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        <span>{course.faculty}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {isEnrolled ? (
                    activeView === 'enrolled' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-500 dark:hover:text-red-400"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleUnenroll(course.id);
                        }}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <MinusCircle className="h-4 w-4" />
                            Leave course
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <CheckCircle className="h-4 w-4" />
                        Enrolled
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleEnroll(course.id);
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Enroll
                        </>
                      )}
                    </button>
                  )}
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-300">
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Course Modal - Only for Admins */}
      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Course</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="input"
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                    className="input"
                    placeholder="e.g., Fall 2025"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty/Department
                </label>
                <input
                  type="text"
                  value={newCourse.faculty}
                  onChange={(e) => setNewCourse({ ...newCourse, faculty: e.target.value })}
                  className="input"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="input min-h-[100px] resize-none"
                  placeholder="Brief description of the course..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Course
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
