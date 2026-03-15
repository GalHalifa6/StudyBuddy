import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle,
  FileText,
  MessageSquare,
  Send,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ReportType = 'bug' | 'content' | 'user' | 'feedback';

type ReportOption = {
  value: ReportType;
  icon: LucideIcon;
  label: string;
  description: string;
  helper: string;
  color: string;
};

const reportTypes: ReportOption[] = [
  {
    value: 'bug',
    icon: Bug,
    label: 'Bug Report',
    description: 'Report technical issues, broken flows, or visual glitches.',
    helper: 'Useful details: page name, what you expected, and what actually happened.',
    color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  },
  {
    value: 'content',
    icon: AlertTriangle,
    label: 'Inappropriate Content',
    description: 'Flag content that breaks community expectations or classroom norms.',
    helper: 'Include the group, course, or message context if you have it.',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  },
  {
    value: 'user',
    icon: Shield,
    label: 'User Behavior',
    description: 'Report harassment, spam, impersonation, or unsafe conduct.',
    helper: 'Include usernames, timestamps, and where the behavior occurred.',
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  },
  {
    value: 'feedback',
    icon: MessageSquare,
    label: 'General Feedback',
    description: 'Share suggestions, friction points, or ideas for improvement.',
    helper: 'Helpful feedback usually explains what felt confusing and what would improve it.',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  },
];

const subjectMinLength = 6;
const subjectMaxLength = 80;
const descriptionMinLength = 24;

const SendReport: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const selectedReport = useMemo(
    () => reportTypes.find((type) => type.value === reportType),
    [reportType]
  );

  const subjectError = useMemo(() => {
    const trimmed = subject.trim();
    if (!showErrors) return '';
    if (!trimmed) return 'Add a short subject so the team can triage this quickly.';
    if (trimmed.length < subjectMinLength) return `Use at least ${subjectMinLength} characters for the subject.`;
    if (trimmed.length > subjectMaxLength) return `Keep the subject under ${subjectMaxLength} characters.`;
    return '';
  }, [showErrors, subject]);

  const descriptionError = useMemo(() => {
    const trimmed = description.trim();
    if (!showErrors) return '';
    if (!trimmed) return 'Add enough detail for someone else to understand the issue.';
    if (trimmed.length < descriptionMinLength) return `Add at least ${descriptionMinLength} characters so the report is actionable.`;
    return '';
  }, [description, showErrors]);

  const isValid = Boolean(
    selectedReport &&
      subject.trim().length >= subjectMinLength &&
      subject.trim().length <= subjectMaxLength &&
      description.trim().length >= descriptionMinLength
  );

  const resetForm = () => {
    setReportType('');
    setSubject('');
    setDescription('');
    setShowErrors(false);
    setSubmitted(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);

    if (!isValid) {
      return;
    }

    setSubmitted(true);
  };

  if (submitted && selectedReport) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
        <div className="rounded-3xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900/40 dark:bg-gray-900">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Report ready for review</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
            Your {selectedReport.label.toLowerCase()} includes the context a reviewer needs to pick it up quickly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={resetForm} className="btn-secondary">
              Send another report
            </button>
            <Link to="/help" className="btn-primary inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Back to help center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.2em]">Moderation & Support</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold md:text-4xl">Send a report with enough context to act on</h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">
                Use this form for bugs, moderation issues, and product feedback. The more specific the details, the faster someone can review it.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-white">Before you send</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Include page names, group names, or usernames when possible.</li>
              <li>Describe what happened and what you expected instead.</li>
              <li>Avoid sharing passwords or private credentials.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Choose a report type</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pick the option that matches the situation so the right team can review it first.
            </p>
          </div>
          <Link to="/help" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" />
            Back to help
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setReportType(type.value)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                reportType === type.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 ${type.color}`}>
                  <type.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{type.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                  <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">{type.helper}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedReport && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Report details</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Focus on the facts first: where it happened, who or what was involved, and what needs attention.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Brief summary of the issue"
                className={`input ${subjectError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                maxLength={subjectMaxLength + 20}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={subjectError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                  {subjectError || 'Keep it short and specific so it can be triaged quickly.'}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {subject.trim().length}/{subjectMaxLength}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What happened, where did it happen, and what should the team know to review it?"
                rows={9}
                className={`input min-h-[220px] resize-y ${descriptionError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={descriptionError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                  {descriptionError || `Aim for at least ${descriptionMinLength} characters so the report is actionable.`}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {description.trim().length} chars
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="flex gap-3">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium text-gray-900 dark:text-white">Your report stays focused and confidential</p>
                  <p>
                    Share enough context for review, but avoid passwords, full payment details, or anything you would not want copied into an audit trail.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Submit report
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType('');
                  setShowErrors(false);
                }}
                className="btn-secondary"
              >
                Change report type
              </button>
            </div>
          </form>

          <aside className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-3">
              <div className={`inline-flex rounded-xl p-3 ${selectedReport.color}`}>
                <selectedReport.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedReport.label}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedReport.description}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Helpful context to include</p>
              <p className="mt-2 text-sm leading-relaxed text-indigo-700 dark:text-indigo-300">
                {selectedReport.helper}
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-900 dark:text-white">Not sure this is the right place?</p>
              <div className="space-y-2">
                <Link to="/questions" className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:border-purple-200 hover:bg-purple-50 dark:border-gray-800 dark:hover:border-purple-900 dark:hover:bg-purple-950/20">
                  <span>Use the questions hub</span>
                  <MessageSquare className="h-4 w-4" />
                </Link>
                <Link to="/help" className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-gray-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20">
                  <span>Browse help guidance</span>
                  <FileText className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default SendReport;