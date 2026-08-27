import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import Accounting from './pages/Accounting';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import { initCategories } from './db/database';

const Stats = lazy(() => import('./pages/Stats'));
const Settings = lazy(() => import('./pages/Settings'));

function AppContent() {
  const location = useLocation();
  return (
    <Layout>
      <AnimatePresence mode="popLayout" initial={false}>
        <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">加载中...</div>}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:id" element={<NoteDetail />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initCategories().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-warm-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
            记
          </div>
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
