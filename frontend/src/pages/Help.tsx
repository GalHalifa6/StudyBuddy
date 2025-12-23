import React from 'react';
import { BookOpen, MessageSquare, Mail, ExternalLink, HelpCircle, FileText } from 'lucide-react';

const Help: React.FC = () => {
  const helpCategories = [
    {
      icon: BookOpen,
      title: 'Getting Started',
      description: 'Learn the basics of StudyBuddy',
      articles: [
        'How to create your first study group',
        'Finding the right courses',
        'Understanding your dashboard',
        'Setting up your profile',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Study Groups',
      description: 'Everything about collaboration',
      articles: [
        'Joining and creating groups',
        'Group messaging and files',
        'Managing group members',
        'Group settings and privacy',
      ],
    },
    {
      icon: HelpCircle,
      title: 'Expert Sessions',
      description: 'Get help from experts',
      articles: [
        'Booking expert sessions',
        'Session preparation tips',
        'Virtual session guidelines',
        'Rating and feedback',
      ],
    },
    {
      icon: FileText,
      title: 'FAQ',
      description: 'Frequently asked questions',
      articles: [
        'Account and billing',
        'Privacy and security',
        'Technical issues',
        'Community guidelines',
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-indigo-100 text-lg mb-6">
            Search our help center or browse categories below
          </p>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/20"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpCategories.map((category, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <category.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category.description}
                </p>
              </div>
            </div>
            
            <ul className="space-y-2">
              {category.articles.map((article, idx) => (
                <li key={idx}>
                  <a
                    href="#"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 py-1"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    {article}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <Mail className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Still need help?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
              Contact Support
            </button>
            <button className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium">
              Community Forum
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
