import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type HelpArticle = {
  title: string;
  summary: string;
  to: string;
};

type HelpCategory = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  articles: HelpArticle[];
};

const helpCategories: HelpCategory[] = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Set up your profile, learn the dashboard, and find your first next step.',
    accent: 'from-blue-500/15 to-indigo-500/15 text-blue-600 dark:text-blue-300',
    articles: [
      {
        title: 'Create your first study group',
        summary: 'Browse existing groups or start one around an upcoming exam or assignment.',
        to: '/groups',
      },
      {
        title: 'Understand your dashboard',
        summary: 'Use the overview cards, quick actions, and feed to find your next move faster.',
        to: '/dashboard',
      },
      {
        title: 'Set up your profile and interests',
        summary: 'Keep your topics, availability, and collaboration style up to date for better matches.',
        to: '/settings',
      },
    ],
  },
  {
    icon: MessageSquare,
    title: 'Study Groups',
    description: 'Messaging, membership, files, and day-to-day collaboration guidance.',
    accent: 'from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-300',
    articles: [
      {
        title: 'Join or create a group that fits your course',
        summary: 'Use filters, match scores, and availability to find a better collaboration fit.',
        to: '/groups',
      },
      {
        title: 'Work inside your group workspace',
        summary: 'Chat, share files, and manage events from one place without losing context.',
        to: '/my-groups',
      },
      {
        title: 'Catch up on unread conversations',
        summary: 'Review group threads and direct messages before your next session starts.',
        to: '/messages',
      },
    ],
  },
  {
    icon: HelpCircle,
    title: 'Expert Sessions',
    description: 'Find mentors, reserve slots, and prepare for live support sessions.',
    accent: 'from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-300',
    articles: [
      {
        title: 'Browse upcoming expert sessions',
        summary: 'See upcoming availability, reserve a spot, and stay on schedule.',
        to: '/sessions',
      },
      {
        title: 'Ask a question before your session',
        summary: 'Use the Q&A area when you need expert input before booking a full meeting.',
        to: '/questions',
      },
      {
        title: 'Review your upcoming events',
        summary: 'Keep an eye on booked sessions, group events, and deadlines in one timeline.',
        to: '/upcoming-events',
      },
    ],
  },
  {
    icon: FileText,
    title: 'Policies and Support',
    description: 'Find the right path when something goes wrong or needs moderator attention.',
    accent: 'from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-300',
    articles: [
      {
        title: 'Report a bug or community issue',
        summary: 'Send a clear report with enough context for moderators to review it quickly.',
        to: '/send-report',
      },
      {
        title: 'Update privacy, language, and learning preferences',
        summary: 'Keep your account details current so your recommendations stay relevant.',
        to: '/settings',
      },
      {
        title: 'Return to your learning hub',
        summary: 'Jump back to the dashboard when you just need the fastest route to action.',
        to: '/dashboard',
      },
    ],
  },
];

const Help: React.FC = () => {
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return helpCategories;
    }

    return helpCategories
      .map((category) => {
        const categoryMatches = [category.title, category.description]
          .some((value) => value.toLowerCase().includes(normalizedQuery));

        const matchingArticles = category.articles.filter((article) =>
          [article.title, article.summary]
            .some((value) => value.toLowerCase().includes(normalizedQuery))
        );

        if (!categoryMatches && matchingArticles.length === 0) {
          return null;
        }

        return {
          ...category,
          articles: categoryMatches ? category.articles : matchingArticles,
        };
      })
      .filter((category): category is HelpCategory => category !== null);
  }, [query]);

  const visibleArticleCount = filteredCategories.reduce(
    (count, category) => count + category.articles.length,
    0
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="flex items-center gap-2 text-indigo-100">
            <LifeBuoy className="h-5 w-5" />
            <span className="text-sm uppercase tracking-[0.2em]">Support Center</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold md:text-4xl">Find help without leaving your workflow</h1>
            <p className="max-w-2xl text-base leading-relaxed text-indigo-100 md:text-lg">
              Search the most common StudyBuddy tasks, jump straight to the right screen, or report an issue with enough context for the team to act on it quickly.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-200" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help topics, workflows, or troubleshooting tips"
                className="w-full rounded-2xl border border-white/15 bg-white/95 py-4 pl-12 pr-4 text-gray-900 shadow-sm outline-none transition focus:border-white focus:ring-4 focus:ring-white/20"
              />
            </label>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-indigo-100 backdrop-blur-sm">
              {visibleArticleCount} helpful path{visibleArticleCount === 1 ? '' : 's'} available
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/questions"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
            >
              Open Q&A
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/send-report"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Report an issue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No matching help topics</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Try a simpler keyword, or go straight to the report form if you need hands-on support.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn-secondary"
            >
              Clear search
            </button>
            <Link to="/send-report" className="btn-primary inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact support
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCategories.map((category) => (
            <section
              key={category.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-5 flex items-start gap-4">
                <div className={`rounded-2xl bg-gradient-to-br p-3 ${category.accent}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category.title}</h2>
                  <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{category.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {category.articles.map((article) => (
                  <Link
                    key={`${category.title}-${article.title}`}
                    to={article.to}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/70 dark:border-gray-800 dark:bg-gray-950/40 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 transition group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                        {article.title}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        {article.summary}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-indigo-900/50 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Need a human review?</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Use the report form when you need moderator attention, found a bug, or need help with something that should not be handled in public.
          </p>
          <Link to="/send-report" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-300">
            Open the report form
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Prefer community support?</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            The Q&A hub is usually the fastest place to ask about coursework, session prep, and shared study tactics.
          </p>
          <Link to="/questions" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-300">
            Open questions hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Help;