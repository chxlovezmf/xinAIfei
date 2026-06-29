import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, StickyNote, ArrowRight, Camera, Image, Check, Upload } from 'lucide-react';
import type { Transaction, Note } from '../types';
import { getTransactionsByMonth, getAllNotes } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { PageTransition } from '../components/Layout';
import AddTransactionSheet from '../components/AddTransactionSheet';
import { ListSkeleton, CardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

// ---- Preset card backgrounds ----
const PRESET_BGS = [
  { key: 'teal',    name: '青绿', css: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
  { key: 'purple',  name: '紫韵', css: 'linear-gradient(135deg, #a855f7, #7e22ce)' },
  { key: 'rose',    name: '玫瑰', css: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { key: 'blue',    name: '海蓝', css: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { key: 'amber',   name: '落日', css: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { key: 'emerald', name: '翠绿', css: 'linear-gradient(135deg, #10b981, #047857)' },
  { key: 'indigo',  name: '靛青', css: 'linear-gradient(135deg, #6366f1, #4338ca)' },
  { key: 'pink',    name: '粉黛', css: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { key: 'slate',   name: '星空', css: 'linear-gradient(135deg, #334155, #0f172a)' },
  { key: 'orange',  name: '暖阳', css: 'linear-gradient(135deg, #fb923c, #ea580c)' },
];

const APP_VERSION = '1.1.0';

function loadCardBg(): { type: 'preset' | 'image'; value: string } {
  try {
    const raw = localStorage.getItem('cardBg');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { type: 'preset', value: 'teal' };
}

function resolveBgCss(bg: { type: 'preset' | 'image'; value: string }): string {
  if (bg.type === 'image') {
    return `url('${bg.value}') center/cover no-repeat`;
  }
  return PRESET_BGS.find(b => b.key === bg.value)?.css || 'linear-gradient(135deg, #14b8a6, #0f766e)';
}

export default function Home() {
  const navigate = useNavigate();
  const { year, month } = getCurrentMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  // Avatar state
  const [avatarSrc, setAvatarSrc] = useState<string>(() => localStorage.getItem('avatar') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Balance card editable title
  const [cardTitle, setCardTitle] = useState<string>(() => localStorage.getItem('cardTitle') || '本月结余');
  const [editingTitle, setEditingTitle] = useState(false);
  // Card background state
  const [cardBg, setCardBg] = useState<{ type: 'preset' | 'image'; value: string }>(loadCardBg);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('avatar', avatarSrc);
  }, [avatarSrc]);

  useEffect(() => {
    localStorage.setItem('cardTitle', cardTitle);
  }, [cardTitle]);

  useEffect(() => {
    localStorage.setItem('cardBg', JSON.stringify(cardBg));
  }, [cardBg]);

  // Check app version: reset cached localStorage values when version changes
  useEffect(() => {
    const savedVer = localStorage.getItem('appVersion');
    if (savedVer !== APP_VERSION) {
      localStorage.removeItem('aboutText');
      localStorage.setItem('appVersion', APP_VERSION);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txs, allNotes] = await Promise.all([
      getTransactionsByMonth(year, month),
      getAllNotes(),
    ]);
    setTransactions(txs);
    setNotes(allNotes.slice(0, 5));
    setLoading(false);
  }, [year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleBgChange = (newBg: { type: 'preset' | 'image'; value: string }) => {
    setCardBg(newBg);
    setShowBgPicker(false);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleBgChange({ type: 'image', value: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const today = dayjs().format('YYYY-MM-DD');
  const todayTxs = transactions.filter((t) => t.date === today);
  const todayExpense = todayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayIncome = todayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const monthExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const recentTxs = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">鑫菲日记</h1>
            <p className="text-xs text-gray-400">{dayjs().format('M月D日 dddd')}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-10 w-10 overflow-hidden rounded-full bg-primary-100 hover:bg-primary-200 transition-all dark:bg-primary-900/30"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary-600 font-bold text-sm dark:text-primary-400">
                记
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
              <Camera size={14} className="text-white opacity-0 group-hover:opacity-100" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <ListSkeleton count={3} />
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-5 overflow-hidden rounded-2xl p-5 text-white shadow-lg"
              style={{ background: resolveBgCss(cardBg) }}
            >
              {cardBg.type === 'image' && (
                <div className="absolute inset-0 bg-black/40" />
              )}
              <div className="relative z-10">
                {editingTitle ? (
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                    className="w-full bg-white/20 rounded px-2 py-0.5 text-sm text-white outline-none placeholder-white/50"
                    placeholder="输入标题"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm text-primary-100 cursor-pointer hover:text-white transition-colors"
                    onClick={() => setEditingTitle(true)}
                    title="点击编辑标题"
                  >
                    {cardTitle}
                  </p>
                )}
                <p className="mt-1 text-3xl font-bold">
                  {monthIncome - monthExpense >= 0 ? '' : '-'}
                  {formatAmount(Math.abs(monthIncome - monthExpense))}
                </p>
                <div className="mt-4 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full bg-white/20 p-1">
                      <TrendingUp size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-primary-100">收入</p>
                      <p className="text-sm font-semibold">{formatAmount(monthIncome)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full bg-white/20 p-1">
                      <TrendingDown size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-primary-100">支出</p>
                      <p className="text-sm font-semibold">{formatAmount(monthExpense)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/20 pt-3">
                  <div className="flex justify-between text-xs text-primary-100">
                    <span>今日支出 <strong className="text-white">{formatAmount(todayExpense)}</strong></span>
                    <span>今日收入 <strong className="text-white">{formatAmount(todayIncome)}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowBgPicker(true); }}
                className="absolute top-3 right-3 z-20 rounded-full bg-white/20 p-1.5 text-white/80 backdrop-blur-sm hover:bg-white/30 hover:text-white transition-all"
                title="更换背景"
              >
                <Image size={14} />
              </button>
            </motion.div>

            {/* Background Picker Modal */}
            <AnimatePresence>
              {showBgPicker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                  onClick={() => setShowBgPicker(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">选择卡片背景</h3>
                    <div className="mb-4 grid grid-cols-5 gap-2">
                      {PRESET_BGS.map((bg) => (
                        <button
                          key={bg.key}
                          onClick={() => handleBgChange({ type: 'preset', value: bg.key })}
                          className="group relative aspect-[3/2] rounded-xl overflow-hidden shadow-sm ring-2 ring-transparent transition-all hover:ring-primary-400 active:scale-95"
                          style={{ background: bg.css }}
                          title={bg.name}
                        >
                          {cardBg.type === 'preset' && cardBg.value === bg.key && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Check size={16} className="text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-colors dark:border-gray-700 dark:text-gray-400"
                    >
                      <Upload size={16} />
                      从图库选择图片
                    </button>
                    <input
                      ref={bgFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBgImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowBgPicker(false)}
                      className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300"
                    >
                      取消
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="mb-5 flex gap-3">
              <button
                onClick={() => setShowSheet(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 shadow-sm text-sm font-medium text-gray-700 active:scale-95 transition-all dark:bg-gray-800 dark:text-gray-300"
              >
                <Plus size={18} className="text-primary-500" />
                记一笔
              </button>
              <button
                onClick={() => navigate('/notes')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 shadow-sm text-sm font-medium text-gray-700 active:scale-95 transition-all dark:bg-gray-800 dark:text-gray-300"
              >
                <StickyNote size={18} className="text-amber-500" />
                随手记
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="mb-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">最近账目</h2>
                <button
                  onClick={() => navigate('/accounting')}
                  className="flex items-center gap-0.5 text-xs text-primary-500"
                >
                  查看全部 <ArrowRight size={14} />
                </button>
              </div>
              {recentTxs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">还没有账目记录</p>
              ) : (
                <div className="space-y-1.5">
                  {recentTxs.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${tx.type === 'expense' ? 'bg-red-400' : 'bg-primary-400'}`} />
                        <span className="text-xs text-gray-500">{tx.note || tx.date.slice(5)}</span>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-primary-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Notes */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">最近记事</h2>
                <button
                  onClick={() => navigate('/notes')}
                  className="flex items-center gap-0.5 text-xs text-primary-500"
                >
                  查看全部 <ArrowRight size={14} />
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">还没有笔记</p>
              ) : (
                <div className="space-y-1.5">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                        {note.title || note.content}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {dayjs(note.updatedAt).format('M/D HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setShowSheet(true)}
          className="fixed bottom-20 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>

        <AddTransactionSheet
          open={showSheet}
          onClose={() => setShowSheet(false)}
          onSaved={loadData}
          editTx={null}
        />
      </div>
    </PageTransition>
  );
}
