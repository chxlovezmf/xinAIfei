import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import Accounting from './pages/Accounting';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import { initCategories } from './db/database';

function AppContent() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:id" element={<NoteDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
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
