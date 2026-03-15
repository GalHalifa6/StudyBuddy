import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../api';
import { Course } from '../types';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  GraduationCap,
  Loader2,
  MinusCircle,
  Users
} from 'lucide-react';

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingCourseId, setProcessingCourseId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCourses = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await courseService.getMyCourses();
      setCourses(data);
    } catch (error) {
      setErrorMessage('We could not load your courses. Please refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleUnenroll = async (courseId: number) => {
    setProcessingCourseId(courseId);
    setErrorMessage(null);
    try {
      await courseService.unenrollFromCourse(courseId);
      await loadCourses();
      setSuccessMessage('Course removed. You can always re-enroll from Browse Courses.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (error) {
      setErrorMessage('Unable to unenroll right now. Please try again.');
    } finally {
      setProcessingCourseId(null);
    }
  };

  const heroSection = (
    <div className="gradient-bg rounded-2xl p-8 text-white relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            My Courses
          </div>
          <h1 className="text-3xl font-bold">Your Learning Journey</h1>
          <p className="mt-2 text-white/80 max-w-lg">
            Track progress, jump into study groups, and revisit key materials from every course you are enrolled in.
          </p>
        </div>
        <div className="flex-shrink-0 bg-white/20 rounded-2xl px-6 py-4 text-center min-w-[140px]">
          <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Enrolled</p>
          <p className="text-4xl font-bold">{isLoading ? '—' : courses.length}</p>
          <p className="text-xs text-white/70 mt-1">Active courses</p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {heroSection}
        <div className="flex h-40 flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        {heroSection}
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <GraduationCap className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No enrolled courses yet</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Browse live and upcoming courses to start building your personalized study hub.
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700 transition-colors"
          >
            Browse courses
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {heroSection}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{courses.length} course{courses.length !== 1 ? 's' : ''} enrolled</p>
        <button
          onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Explore catalog
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          return (
            <div key={course.id} className="flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 text-lg font-bold text-white">
                      {course.code.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">Enrolled</p>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                      {course.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{course.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                    {course.semester || 'Current'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="inline-flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.code}</span>
                  </div>
                  {course.faculty && (
                    <div className="inline-flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>{course.faculty}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.groupCount ?? 0} study groups</span>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-600 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-primary-900/40 dark:text-primary-300 dark:hover:border-primary-700 dark:hover:text-primary-200"
                >
                  Open course space
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleUnenroll(course.id)}
                  disabled={processingCourseId === course.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-500 dark:hover:text-red-400"
                >
                  {processingCourseId === course.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-4 w-4" />
                      Unenroll
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyCourses;
