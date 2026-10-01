import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pin, PinOff, Search, StickyNote, FileText, CheckCircle2, Circle, CalendarDays, BookOpen, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Note, Task as TaskType } from '../types';
import { getAllNotes, addNote, deleteNote, updateNote, getAllTasks, addTask as dbAddTask, updateTask as dbUpdateTask, deleteTask as dbDeleteTask } from '../db/database';
import { formatDateTime } from '../utils/format';
import { PageTransition } from '../components/Layout';
import EmptyState from '../components/EmptyState';
import dayjs from 'dayjs';

export default function Notes() {
  const navigate = useNavigate();
  const isBubuTheme = document.documentElement.dataset.theme === 'bubu';
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'schedule' | 'diary'>(() => {
    return tabParam === 'schedule' ? 'schedule' : 'diary';
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [quickNote, setQuickNote] = useState('');

  // Schedule state: show all tasks, while keeping a date for newly added tasks.
  const today = dayjs().format('YYYY-MM-DD');
  const [taskDate, setTaskDate] = useState(today);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const loadNotes = useCallback(async () => {
    const all = await getAllNotes();
    setNotes(all);
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
    setTasks(await getAllTasks());
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

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
    await loadTasks();
  };

  const toggleTask = async (task: TaskType) => {
    if (task.id) {
      await dbUpdateTask(task.id, { done: !task.done, updatedAt: new Date().toISOString() });
      await loadTasks();
    }
  };

  const delTask = async (id: number | undefined) => {
    if (id && window.confirm('确定要删除这个任务吗？')) {
      await dbDeleteTask(id);
      await loadTasks();
    }
  };

  const clearCompletedTasks = async () => {
    const completed = tasks.filter(task => task.done && task.id);
    if (!completed.length || !window.confirm(`确定删除 ${completed.length} 条已完成日程吗？`)) return;
    await Promise.all(completed.map(task => dbDeleteTask(task.id!)));
    await loadTasks();
  };

  const startEditTask = (task: TaskType) => {
    setEditingTaskId(task.id || null);
    setEditingTaskText(task.text);
  };

  const saveEditTask = async () => {
    if (editingTaskId && editingTaskText.trim()) {
      await dbUpdateTask(editingTaskId, { text: editingTaskText.trim(), updatedAt: new Date().toISOString() });
      setEditingTaskId(null);
      await loadTasks();
    }
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const formatTaskDate = (date: string) => {
    const relative = date === today ? '今天' : date === dayjs().subtract(1, 'day').format('YYYY-MM-DD') ? '昨天' : '';
    return `${relative ? relative + ' · ' : ''}${dayjs(date).format('YYYY年M月D日')}`;
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

  const pendingCount = tasks.filter(task => !task.done && task.date === today).length;
  const completedCount = tasks.filter(task => task.done).length;
  const sortedTasks = [...tasks].sort((a, b) =>
    b.date.localeCompare(a.date) || Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 page-title"><span className="sticker-emoji text-base">📔</span>记事</h1>
          {activeTab === 'diary' && (
            <button onClick={() => navigate('/notes/new')} className="btn-primary bubu-art-button gap-1 py-2 px-4 text-sm">
              <FileText size={16} />写日记
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-1 rounded-full bg-gray-100/80 p-1 dark:bg-gray-800/80">
          <button onClick={() => setActiveTab('schedule')}
            className={'relative flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-all ' +
              (activeTab === 'schedule' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500')}>
            {activeTab === 'schedule' && (
              <motion.div layoutId="notes-tab-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-700" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative flex items-center gap-1.5"><CalendarDays size={16} />日程
            {pendingCount > 0 && activeTab !== 'schedule' && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] text-white">{pendingCount}</span>
            )}</span>
          </button>
          <button onClick={() => setActiveTab('diary')}
            className={'relative flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-all ' +
              (activeTab === 'diary' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500')}>
            {activeTab === 'diary' && (
              <motion.div layoutId="notes-tab-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-700" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative flex items-center gap-1.5"><BookOpen size={16} />日记</span>
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">全部日程</p>
                <p className="text-xs text-gray-400">按日期查看每一项安排</p>
              </div>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => void clearCompletedTasks()}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/35"
                >
                  <Trash2 size={13} />清除已完成
                </button>
              )}
            </div>

            <div className="mb-2 flex gap-2">
              <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="添加新任务..." className="input-field flex-1 text-sm" />
              <button onClick={addTask} className="btn-primary px-4 text-sm">添加</button>
            </div>
            <label className="mb-4 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
              <CalendarDays size={15} className="shrink-0 text-primary-500" />
              <span>安排日期</span>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="ml-auto border-none bg-transparent text-sm text-gray-700 outline-none dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="日程日期"
              />
            </label>
            {tasks.length === 0 ? (
              <EmptyState title="还没有任务" description="添加一个任务开始规划吧"
                illustration={isBubuTheme ? '/themes/bubu/notes-empty.png' : undefined} />
            ) : (
              <div className="space-y-1.5">
                {sortedTasks.map((task, i) => (
                  <motion.div key={task.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                    className="glass-card flex items-center gap-3 px-3 py-2.5">
                    <motion.button whileTap={{ scale: 0.75 }} onClick={() => toggleTask(task)}
                      className="text-gray-400 hover:text-primary-500 transition-colors shrink-0">
                      {task.done ? (
                        <motion.div key="done" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
                          <CheckCircle2 size={20} className="text-primary-500" />
                        </motion.div>
                      ) : <Circle size={20} />}
                    </motion.button>
                    {editingTaskId === task.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1">
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
                      <span className={'min-w-0 flex-1 text-sm ' + (task.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>
                        {task.text}
                      </span>
                    )}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-gray-100/80 px-2 py-1 text-[10px] text-gray-500 dark:bg-gray-700/80 dark:text-gray-300">
                        <CalendarDays size={11} />{formatTaskDate(task.date)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => startEditTask(task)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 dark:hover:bg-gray-700">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => delTask(task.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
                description={search ? '换个关键词试试' : '随手记或写一篇长篇日记吧'}
                illustration={!search && isBubuTheme ? '/themes/bubu/diary-empty.png' : undefined} />
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
      whileHover={{ scale: 1.01, x: 2 }}
      className={'glass-card cursor-pointer px-4 py-3 ' + (pinned ? 'relative overflow-hidden' : '')} onClick={onClick}>
      {pinned && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-primary-400 to-purple-400" />}
      <div className="flex-1 min-w-0">
        {note.type === 'long' && note.title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{note.title}</h3>
        )}
        <p className={'text-sm text-gray-600 dark:text-gray-400 ' + (note.title ? 'mt-0.5' : '') + ' line-clamp-2'}>{note.content}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDateTime(note.updatedAt)}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onPin(note)} className="rounded p-1 text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }} onClick={onDelete} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
