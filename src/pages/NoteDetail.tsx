import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import type { Note } from '../types';
import { addNote, updateNote, deleteNote, getAllNotes } from '../db/database';
import EmptyState from '../components/EmptyState';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      getAllNotes().then((notes) => {
        const note = notes.find((n) => n.id === Number(id));
        if (note) {
          setTitle(note.title || '');
          setContent(note.content);
        }
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);

    if (isNew) {
      await addNote({
        title: title.trim(),
        content: content.trim(),
        type: content.trim().length > 200 || title.trim() ? 'long' : 'short',
        tags: [],
        pinned: false,
        transactionId: null,
      });
    } else if (id) {
      await updateNote(Number(id), {
        title: title.trim(),
        content: content.trim(),
        type: content.trim().length > 200 || title.trim() ? 'long' : 'short',
      });
    }

    setSaving(false);
    navigate('/notes?tab=diary');
  };

  const handleDelete = async () => {
    if (id && !isNew) {
      await deleteNote(Number(id));
      navigate('/notes?tab=diary');
    }
  };

  if (!loaded) {
    return (
      <div className="page-container">
        <div className="card animate-pulse space-y-3">
          <div className="h-6 w-1/2 rounded bg-gray-200" />
          <div className="h-40 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col bg-warm-50 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/80">
        <button onClick={() => navigate('/notes?tab=diary')} className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
          <ArrowLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {isNew ? '写日记' : '编辑日记'}
        </span>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={handleDelete} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary gap-1 py-2 px-4 text-sm">
            <Save size={16} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 px-4 pt-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full border-none bg-transparent text-xl font-bold text-gray-900 outline-none placeholder-gray-300 dark:text-gray-100"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始写点什么..."
          className="mt-3 min-h-[50vh] w-full resize-none border-none bg-transparent text-base leading-relaxed text-gray-700 outline-none placeholder-gray-300 dark:text-gray-300"
          autoFocus
        />
      </div>

      {/* Bottom info */}
      <div className="px-4 pb-4 text-xs text-gray-400">
        {content.length > 0 && `${content.length} 字`}
      </div>
    </motion.div>
  );
}
