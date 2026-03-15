import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-slate-900/90 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={mobileSidebarOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
            >
              {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">StudyBuddy</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Learning workspace</p>
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;