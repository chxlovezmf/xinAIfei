import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pin, PinOff, Search, StickyNote, FileText, CheckCircle2, Circle, CalendarDays, BookOpen, Trash2 } from 'lucide-react';
import type { Note } from '../types';
import { getAllNotes, addNote, deleteNote, updateNote } from '../db/database';
import { formatDateTime } from '../utils/format';
import { PageTransition } from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: string;
}

function loadTasks(date: string): Task[] {
  try {
    const data = localStorage.getItem('tasks_' + date);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveTasks(date: string, tasks: Task[]) {
  localStorage.setItem('tasks_' + date, JSON.stringify(tasks));
}

export default function Notes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'schedule' | 'diary'>('schedule');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const today = dayjs().format('YYYY-MM-DD');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(today));
  const [newTask, setNewTask] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const all = await getAllNotes();
    setNotes(all);
    setLoading(false);
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      text: newTask.trim(),
      done: false,
      date: today,
      createdAt: new Date().toISOString(),
    };
    const updated = [...tasks, task];
    setTasks(updated);
    saveTasks(today, updated);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    saveTasks(today, updated);
  };

  const delTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveTasks(today, updated);
  };

  const handleQuickNote = async () => {
    if (!quickNote.trim()) return;
    await addNote({ title: '', content: quickNote.trim(), type: 'short', tags: [], pinned: false, transactionId: null });
    setQuickNote('');
    loadNotes();
  };

  const handleTogglePin = async (note: Note) => {
    await updateNote(note.id!, { pinned: !note.pinned });
    loadNotes();
  };

  const handleDeleteNote = async (id: number) => {
    await deleteNote(id);
    loadNotes();
  };

  const filteredNotes = notes.filter((note) => {
    if (search) {
      const q = search.toLowerCase();
      return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="page-title">记事</h1>
          {activeTab === 'diary' && (
            <button onClick={() => navigate('/notes/new')} className="btn-primary gap-1 py-2 px-4 text-sm">
              <FileText size={16} />写笔记
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button onClick={() => setActiveTab('schedule')}
            className={'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ' +
              (activeTab === 'schedule' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}>
            <CalendarDays size={16} />日程
          </button>
          <button onClick={() => setActiveTab('diary')}
            className={'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ' +
              (activeTab === 'diary' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}>
            <BookOpen size={16} />日记
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <>
            <p className="mb-3 text-xs text-gray-400">{dayjs().format('M月D日 dddd')} 的任务</p>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="添加新任务..." className="input-field flex-1 text-sm" />
              <button onClick={addTask} className="btn-primary px-4 text-sm">添加</button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState title="今天还没有任务" description="添加一个任务开始规划一天" />
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
                    <button onClick={() => toggleTask(task.id)} className="text-gray-400 hover:text-primary-500 transition-colors">
                      {task.done ? <CheckCircle2 size={20} className="text-primary-500" /> : <Circle size={20} />}
                    </button>
                    <span className={'flex-1 text-sm ' + (task.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>
                      {task.text}
                    </span>
                    <button onClick={() => delTask(task.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700">
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索日记..." className="input-field pl-9" />
            </div>
            <div className="mb-4 flex gap-2">
              <input type="text" value={quickNote} onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickNote()} placeholder="随手记..." className="input-field flex-1" />
              <button onClick={handleQuickNote} className="btn-primary px-4 text-sm">记</button>
            </div>
            {filteredNotes.length === 0 ? (
              <EmptyState icon={search ? <Search size={48} /> : <StickyNote size={48} />}
                title={search ? '没有找到匹配的日记' : '还没有日记'}
                description={search ? '换个关键词试试' : '随手记或写一篇长篇日记吧'} />
            ) : (
              <div className="space-y-2">
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onPin={handleTogglePin}
                    onDelete={() => note.id && handleDeleteNote(note.id)} onClick={() => navigate('/notes/' + note.id)} pinned />
                ))}
                {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 dark:border-gray-700" />
                )}
                {unpinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onPin={handleTogglePin}
                    onDelete={() => note.id && handleDeleteNote(note.id)} onClick={() => navigate('/notes/' + note.id)} pinned={false} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}

function NoteCard({ note, onPin, onDelete, onClick, pinned }: any) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <div className="flex-1 min-w-0">
        {note.type === 'long' && note.title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{note.title}</h3>
        )}
        <p className={'text-sm text-gray-600 dark:text-gray-400 ' + (note.title ? 'mt-0.5' : '') + ' line-clamp-2'}>{note.content}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDateTime(note.updatedAt)}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onPin(note)} className="rounded p-1 text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button onClick={onDelete} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
