import { useNavigate } from 'react-router-dom';
import {
  Star,
  MessageCircle,
  Users,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface SessionEndedScreenProps {
  expertName: string;
  elapsedTime: number;
  messageCount: number;
  participantCount: number;
  isExpert: boolean;
  studentRating: number;
  onRate: (rating: number) => void;
  formatTime: (seconds: number) => string;
}

export default function SessionEndedScreen({
  expertName,
  elapsedTime,
  messageCount,
  participantCount,
  isExpert,
  studentRating,
  onRate,
  formatTime,
}: SessionEndedScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gray-800/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-700 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
        <p className="text-gray-400 mb-8">Great session with {expertName}</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-700/50 rounded-xl p-4">
            <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{formatTime(elapsedTime)}</p>
            <p className="text-xs text-gray-400">Duration</p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4">
            <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{messageCount}</p>
            <p className="text-xs text-gray-400">Messages</p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4">
            <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{participantCount}</p>
            <p className="text-xs text-gray-400">Participants</p>
          </div>
        </div>

        {!isExpert && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Rate your experience</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRate(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= studentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/sessions')}
            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
          >
            Browse Sessions
          </button>
          <button
            onClick={() => navigate(isExpert ? '/expert-dashboard' : '/dashboard')}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700"
          >
            {isExpert ? 'Dashboard' : 'Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
