import React, { useState } from 'react';
import { AlertTriangle, Bug, MessageSquare, Shield, Send, CheckCircle } from 'lucide-react';

const SendReport: React.FC = () => {
  const [reportType, setReportType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reportTypes = [
    {
      value: 'bug',
      icon: Bug,
      label: 'Bug Report',
      description: 'Report technical issues or errors',
      color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    },
    {
      value: 'content',
      icon: AlertTriangle,
      label: 'Inappropriate Content',
      description: 'Report violations or offensive content',
      color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
    },
    {
      value: 'user',
      icon: Shield,
      label: 'User Behavior',
      description: 'Report harassment or misconduct',
      color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      value: 'feedback',
      icon: MessageSquare,
      label: 'General Feedback',
      description: 'Share suggestions or concerns',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate submission
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setReportType('');
      setSubject('');
      setDescription('');
      setSubmitted(false);
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Report Submitted Successfully
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your report. Our team will review it shortly.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Send a Report
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us maintain a safe and positive learning environment. All reports are reviewed by our team.
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          What would you like to report?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`p-6 rounded-xl border-2 transition text-left ${
                reportType === type.value
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${type.color}`}>
                  <type.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Form */}
      {reportType && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your report"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Include relevant details such as usernames, group names, timestamps, or specific content.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  Your report is confidential
                </p>
                <p>
                  Reports are reviewed by our moderation team. Your identity will be kept private unless required by law.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Submit Report
            </button>
            <button
              type="button"
              onClick={() => setReportType('')}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SendReport;
