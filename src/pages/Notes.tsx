import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pin, PinOff, Search, StickyNote, FileText } from 'lucide-react';
import type { Note } from '../types';
import { getAllNotes, addNote, deleteNote, updateNote } from '../db/database';
import { formatDateTime } from '../utils/format';
import { PageTransition } from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const navigate = useNavigate();

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const all = await getAllNotes();
    setNotes(all);
    setLoading(false);
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleQuickNote = async () => {
    if (!quickNote.trim()) return;
    await addNote({
      title: '',
      content: quickNote.trim(),
      type: 'short',
      tags: [],
      pinned: false,
      transactionId: null,
    });
    setQuickNote('');
    loadNotes();
  };

  const handleTogglePin = async (note: Note) => {
    await updateNote(note.id!, { pinned: !note.pinned });
    loadNotes();
  };

  const handleDelete = async (id: number) => {
    await deleteNote(id);
    loadNotes();
  };

  const filtered = notes.filter((note) => {
    if (search) {
      const q = search.toLowerCase();
      return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
    }
    return true;
  });

  const pinnedNotes = filtered.filter((n) => n.pinned);
  const unpinnedNotes = filtered.filter((n) => !n.pinned);

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="page-title">记事</h1>
          <button
            onClick={() => navigate('/notes/new')}
            className="btn-primary gap-1 py-2 px-4 text-sm"
          >
            <FileText size={16} />
            写笔记
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索笔记..."
            className="input-field pl-9"
          />
        </div>

        {/* Quick Note */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickNote()}
            placeholder="随手记..."
            className="input-field flex-1"
          />
          <button onClick={handleQuickNote} className="btn-primary px-4 text-sm">
            记
          </button>
        </div>

        {/* Notes List */}
        {loading ? (
          <ListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? <Search size={48} /> : <StickyNote size={48} />}
            title={search ? '没有找到匹配的笔记' : '还没有笔记'}
            description={search ? '换个关键词试试' : '随手记或写一篇长笔记吧'}
          />
        ) : (
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPin={handleTogglePin}
                onDelete={handleDelete}
                onClick={() => navigate(`/notes/${note.id}`)}
              />
            ))}
            {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
              <div className="border-t border-gray-100 pt-2 dark:border-gray-700" />
            )}
            {unpinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPin={handleTogglePin}
                onDelete={handleDelete}
                onClick={() => navigate(`/notes/${note.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function NoteCard({ note, onPin, onDelete, onClick }: {
  note: Note;
  onPin: (n: Note) => void;
  onDelete: (id: number) => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <div className="mb-1 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {note.type === 'long' && note.title && (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {note.title}
            </h3>
          )}
          <p className={`text-sm text-gray-600 dark:text-gray-400 ${note.title ? 'mt-0.5' : ''} line-clamp-2`}>
            {note.content}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDateTime(note.updatedAt)}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPin(note)}
            className="rounded p-1 text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={note.pinned ? '取消置顶' : '置顶'}
          >
            {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            onClick={() => note.id && onDelete(note.id)}
            className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
