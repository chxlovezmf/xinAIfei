import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pin, PinOff, Search, StickyNote, FileText, CheckCircle2, Circle, CalendarDays, BookOpen, Trash2, Pencil, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Note, Task as TaskType } from '../types';
import { getAllNotes, addNote, deleteNote, updateNote, getTasksByDate, addTask as dbAddTask, updateTask as dbUpdateTask, deleteTask as dbDeleteTask } from '../db/database';
import { formatDateTime } from '../utils/format';
import { PageTransition } from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

export default function Notes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'schedule' | 'diary'>(() => {
    return tabParam === 'schedule' ? 'schedule' : 'diary';
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickNote, setQuickNote] = useState('');

  // Task state with date navigation
  const today = dayjs().format('YYYY-MM-DD');
  const [taskDate, setTaskDate] = useState(today);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [pendingTaskCount, setPendingTaskCount] = useState(0);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const all = await getAllNotes();
    setNotes(all);
    setLoading(false);
    const saved = sessionStorage.getItem('notesScroll');
    if (saved) {
      sessionStorage.removeItem('notesScroll');
      requestAnimationFrame(() => {
        const m = document.querySelector('main');
        if (m) m.scrollTop = Number(saved);
      });
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const loadTasks = useCallback(async () => {
    const t = await getTasksByDate(taskDate);
    setTasks(t);
  }, [taskDate]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Load today's pending count (for badge)
  useEffect(() => {
    getTasksByDate(today).then(t => setPendingTaskCount(t.filter(t => !t.done).length));
  }, [tasks, today]);

  // Navigate task date
  const prevTaskDay = () => {
    setTaskDate(dayjs(taskDate).subtract(1, 'day').format('YYYY-MM-DD'));
  };
  const nextTaskDay = () => {
    const next = dayjs(taskDate).add(1, 'day').format('YYYY-MM-DD');
    if (next <= today) setTaskDate(next);
  };

  const taskDateStr = () => {
    const d = dayjs(taskDate);
    if (taskDate === today) return '今天';
    if (taskDate === dayjs().subtract(1, 'day').format('YYYY-MM-DD')) return '昨天';
    if (taskDate === dayjs().add(1, 'day').format('YYYY-MM-DD')) return '明天';
    return d.format('M月D日 dddd');
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await dbAddTask({
      text: newTask.trim(),
      done: false,
      date: taskDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNewTask('');
    loadTasks();
  };

  const toggleTask = async (task: TaskType) => {
    if (task.id) {
      await dbUpdateTask(task.id, { done: !task.done, updatedAt: new Date().toISOString() });
      loadTasks();
    }
  };

  const delTask = async (id: number | undefined) => {
    if (id && window.confirm('确定要删除这个任务吗？')) {
      await dbDeleteTask(id);
      loadTasks();
    }
  };

  const startEditTask = (task: TaskType) => {
    setEditingTaskId(task.id || null);
    setEditingTaskText(task.text);
  };

  const saveEditTask = async () => {
    if (editingTaskId && editingTaskText.trim()) {
      await dbUpdateTask(editingTaskId, { text: editingTaskText.trim(), updatedAt: new Date().toISOString() });
      setEditingTaskId(null);
      loadTasks();
    }
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
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

  const openNote = (id: number) => {
    const m = document.querySelector('main');
    if (m) sessionStorage.setItem('notesScroll', String(m.scrollTop));
    navigate('/notes/' + id);
  };

  const handleDeleteNote = async (id: number) => {
    if (window.confirm('确定要删除这篇日记吗？')) {
      await deleteNote(id);
      loadNotes();
    }
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

  // Count pending tasks for today
  const pendingCount = pendingTaskCount;

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="page-title">记事</h1>
          {activeTab === 'diary' && (
            <button onClick={() => navigate('/notes/new')} className="btn-primary gap-1 py-2 px-4 text-sm">
              <FileText size={16} />写日记
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button onClick={() => setActiveTab('schedule')}
            className={'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ' +
              (activeTab === 'schedule' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}>
            <CalendarDays size={16} />日程
            {pendingCount > 0 && activeTab !== 'schedule' && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] text-white">{pendingCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('diary')}
            className={'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ' +
              (activeTab === 'diary' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}>
            <BookOpen size={16} />日记
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <>
            {/* Date Navigation */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
              <button onClick={prevTaskDay} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {taskDateStr()}
                {taskDate !== today && (
                  <button onClick={() => setTaskDate(today)} className="ml-2 text-xs text-primary-500 hover:underline">今天</button>
                )}
              </span>
              <button onClick={nextTaskDay} disabled={taskDate >= today} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="添加新任务..." className="input-field flex-1 text-sm" />
              <button onClick={addTask} className="btn-primary px-4 text-sm">添加</button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState title="还没有任务" description="添加一个任务开始规划吧" />
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
                    <button onClick={() => toggleTask(task)} className="text-gray-400 hover:text-primary-500 transition-colors shrink-0">
                      {task.done ? <CheckCircle2 size={20} className="text-primary-500" /> : <Circle size={20} />}
                    </button>
                    {editingTaskId === task.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          type="text"
                          value={editingTaskText}
                          onChange={(e) => setEditingTaskText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEditTask(); if (e.key === 'Escape') cancelEditTask(); }}
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-primary-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          autoFocus
                        />
                        <button onClick={saveEditTask} className="rounded p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-gray-700">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEditTask} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className={'flex-1 text-sm ' + (task.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>
                        {task.text}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => startEditTask(task)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 dark:hover:bg-gray-700">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => delTask(task.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                    onDelete={() => note.id && handleDeleteNote(note.id)} onClick={() => note.id && openNote(note.id)} pinned />
                ))}
                {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 dark:border-gray-700" />
                )}
                {unpinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onPin={handleTogglePin}
                    onDelete={() => note.id && handleDeleteNote(note.id)} onClick={() => note.id && openNote(note.id)} pinned={false} />
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
