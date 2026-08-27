import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Receipt, BookOpen, BarChart3, Settings,
} from 'lucide-react';
import type { PageView } from '../types';
import AmbientBackground from './AmbientBackground';

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
  const isNoteEditor = currentPath.startsWith('/notes/');

  return (
    <div className="flex min-h-dvh flex-col">
      <AmbientBackground />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      {!isNoteEditor && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-lg px-3 pb-2 pt-1">
            <div className="flex items-center justify-around rounded-full border border-white/60 bg-white/80 px-2 py-1 shadow-[0_8px_32px_rgba(251,94,141,0.12)] dark:border-white/10 dark:bg-gray-900/85">
              {tabs.map((tab) => {
                const isActive = currentPath === tab.path;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => navigate(tab.path)}
                    className={`relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-xl grad-card grad-primary grad-animated shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <motion.span
                      animate={isActive ? { y: -1, scale: 1.05 } : { y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      whileTap={{ scale: 0.82 }}
                      className="relative flex flex-col items-center gap-0.5"
                    >
                      <Icon size={21} />
                      <span className="text-[11px] font-medium">{tab.label}</span>
                    </motion.span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
