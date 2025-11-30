import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'switch';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, toggleTheme, setTheme } = useTheme();

  if (variant === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
          theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300'
        } ${className}`}
        aria-label="Toggle theme"
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
            theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
          }`}
        >
          {theme === 'dark' ? (
            <Moon className="w-3 h-3 text-purple-600" />
          ) : (
            <Sun className="w-3 h-3 text-yellow-500" />
          )}
        </div>
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Theme options"
        >
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <button
            onClick={() => setTheme('light')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg ${
              theme === 'light' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg ${
              theme === 'dark' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </div>
    );
  }

  // Default icon variant
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
};

export default ThemeToggle;
