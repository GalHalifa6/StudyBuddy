import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const Messages: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">View your group conversations</p>
      </div>

      <div className="card p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Messages are in your groups
        </h3>
        <p className="text-gray-500 mb-6">
          Join a study group to start messaging with other students
        </p>
        <Link to="/groups" className="btn-primary inline-flex items-center gap-2">
          Browse Groups
        </Link>
      </div>
    </div>
  );
};

export default Messages;
