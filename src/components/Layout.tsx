import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Receipt, BookOpen, BarChart3, Settings,
} from 'lucide-react';
import type { PageView } from '../types';

const tabs: { key: PageView; label: string; icon: typeof LayoutDashboard; path: string }[] = [
  { key: 'home' as PageView, label: '首页', icon: LayoutDashboard, path: '/' },
  { key: 'accounting' as PageView, label: '记账', icon: Receipt, path: '/accounting' },
  { key: 'notes' as PageView, label: '记事', icon: BookOpen, path: '/notes' },
  { key: 'stats' as PageView, label: '统计', icon: BarChart3, path: '/stats' },
  { key: 'settings' as PageView, label: '设置', icon: Settings, path: '/settings' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname || '/';

  return (
    <div className="flex min-h-dvh flex-col bg-warm-50 dark:bg-gray-900">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/80 px-2 pb-2 pt-1 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-1 h-0.5 w-8 rounded-full bg-primary-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon size={22} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
