import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, StickyNote, ArrowRight, Camera, Image, Check, Upload } from 'lucide-react';
import type { Transaction, Note } from '../types';
import { getTransactionsByMonth, getAllNotes } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { PageTransition } from '../components/Layout';
import AddTransactionSheet from '../components/AddTransactionSheet';
import AnimatedNumber from '../components/AnimatedNumber';
import FloatingActionButton from '../components/FloatingActionButton';
import { ListSkeleton, CardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

const PRESET_BGS = [
  { key: 'teal', name: '青绿', css: 'linear-gradient(135deg,#2dd4bf,#0f766e)' },
  { key: 'purple', name: '紫韵', css: 'linear-gradient(135deg,#c084fc,#8b5cf6)' },
  { key: 'rose', name: '玫瑰', css: 'linear-gradient(135deg,#fb7185,#e11d48)' },
  { key: 'blue', name: '海蓝', css: 'linear-gradient(135deg,#60a5fa,#2563eb)' },
  { key: 'amber', name: '落日', css: 'linear-gradient(135deg,#fbbf24,#f97316)' },
  { key: 'emerald', name: '翠绿', css: 'linear-gradient(135deg,#34d399,#059669)' },
  { key: 'indigo', name: '靛青', css: 'linear-gradient(135deg,#818cf8,#4f46e5)' },
  { key: 'pink', name: '粉黛', css: 'linear-gradient(135deg,#f472b6,#db2777)' },
  { key: 'slate', name: '星空', css: 'linear-gradient(135deg,#334155,#0f172a)' },
  { key: 'orange', name: '暖阳', css: 'linear-gradient(135deg,#fdba74,#ea580c)' },
];

const APP_VERSION = '1.4.1';

function loadCardBg(): { type: 'preset' | 'image'; value: string } {
  try { const raw = localStorage.getItem('cardBg'); if (raw) return JSON.parse(raw); } catch {}
  return { type: 'preset', value: 'teal' };
}

function resolveBgCss(bg: { type: 'preset' | 'image'; value: string }): string {
  if (bg.type === 'image') return "url('" + bg.value + "') center/cover no-repeat";
  const found = PRESET_BGS.find(b => b.key === bg.value);
  return found ? found.css : 'linear-gradient(135deg,#2dd4bf,#0f766e)';
}

function compressImage(dataUrl: string, maxW: number, maxH: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      if (h > maxH) { w = w * maxH / h; h = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function Home() {
  const navigate = useNavigate();
  const { year, month } = getCurrentMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string>(() => localStorage.getItem('avatar') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cardTitle, setCardTitle] = useState<string>(() => localStorage.getItem('cardTitle') || '本月结余');
  const [editingTitle, setEditingTitle] = useState(false);
  const [cardBg, setCardBg] = useState<{ type: 'preset' | 'image'; value: string }>(loadCardBg);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('avatar', avatarSrc); }, [avatarSrc]);
  useEffect(() => { localStorage.setItem('cardTitle', cardTitle); }, [cardTitle]);
  useEffect(() => { localStorage.setItem('cardBg', JSON.stringify(cardBg)); }, [cardBg]);
  useEffect(() => {
    const savedVer = localStorage.getItem('appVersion');
    if (savedVer !== APP_VERSION) { localStorage.removeItem('aboutText'); localStorage.setItem('appVersion', APP_VERSION); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txs, allNotes] = await Promise.all([getTransactionsByMonth(year, month), getAllNotes()]);
    setTransactions(txs);
    setNotes(allNotes.slice(0, 5));
    setLoading(false);
  }, [year, month]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result as string;
      if (result) setAvatarSrc(await compressImage(result, 200, 200, 0.6));
    };
    reader.readAsDataURL(file);
  };

  const handleBgChange = (newBg: { type: 'preset' | 'image'; value: string }) => { setCardBg(newBg); setShowBgPicker(false); };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result as string;
      if (result) handleBgChange({ type: 'image', value: await compressImage(result, 800, 600, 0.7) });
    };
    reader.readAsDataURL(file);
  };

  const today = dayjs().format('YYYY-MM-DD');
  const todayTxs = transactions.filter(t => t.date === today);
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayIncome = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const recentTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 dark:text-gray-100"><span className="sticker-emoji text-base">📓</span>鑫菲日记</h1>
            <p className="text-xs text-gray-400">{dayjs().format('M月D日 dddd')}</p>
          </div>
          <div className="rounded-full bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 p-[2px] shadow-sm">
            <button onClick={() => fileInputRef.current?.click()}
              className="group relative block h-10 w-10 overflow-hidden rounded-full bg-primary-100 transition-all dark:bg-primary-900/30">
              {avatarSrc ? <img src={avatarSrc} alt="头像" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-primary-600 font-bold text-sm dark:text-primary-400">记</div>}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all"><Camera size={14} className="text-white opacity-0 group-hover:opacity-100" /></div>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>

        {loading ? <div className="space-y-4"><CardSkeleton /><ListSkeleton count={3} /></div> : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="relative mb-5 overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: resolveBgCss(cardBg) }}>
              {cardBg.type === 'image' && <div className="absolute inset-0 bg-black/40" />}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <span className="absolute right-14 top-3 text-xl animate-float" style={{ animationDuration: '5s' }}>💖</span>
              <span className="absolute bottom-16 left-4 text-lg animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>✨</span>
              <div className="relative z-10">
                {editingTitle ? (
                  <input type="text" value={cardTitle} onChange={e => setCardTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                    className="w-full bg-white/20 rounded px-2 py-0.5 text-sm text-white outline-none placeholder-white/50" placeholder="输入标题" autoFocus />
                ) : (
                  <p className="text-sm text-primary-100 cursor-pointer hover:text-white transition-colors" onClick={() => setEditingTitle(true)} title="点击编辑标题">{cardTitle}</p>
                )}
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {monthIncome - monthExpense >= 0 ? '' : '-'}<AnimatedNumber value={Math.abs(monthIncome - monthExpense)} format={formatAmount} />
                </p>
                <div className="mt-4 flex gap-3">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white/20 px-3 py-1.5">
                    <div className="rounded-full bg-white/25 p-1"><TrendingUp size={14} /></div>
                    <div><p className="text-[11px] text-primary-100">收入</p><p className="text-sm font-semibold"><AnimatedNumber value={monthIncome} format={formatAmount} /></p></div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white/20 px-3 py-1.5">
                    <div className="rounded-full bg-white/25 p-1"><TrendingDown size={14} /></div>
                    <div><p className="text-[11px] text-primary-100">支出</p><p className="text-sm font-semibold"><AnimatedNumber value={monthExpense} format={formatAmount} /></p></div>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/25 pt-3">
                  <div className="flex justify-between text-xs text-primary-100">
                    <span>今日支出 <strong className="text-white"><AnimatedNumber value={todayExpense} format={formatAmount} /></strong></span>
                    <span>今日收入 <strong className="text-white"><AnimatedNumber value={todayIncome} format={formatAmount} /></strong></span>
                  </div>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setShowBgPicker(true); }}
                className="absolute top-3 right-3 z-20 rounded-full bg-white/25 p-1.5 text-white/90 hover:bg-white/35 hover:text-white transition-all" title="更换背景"><Image size={14} /></button>
            </motion.div>

            <AnimatePresence>{showBgPicker && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBgPicker(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
                  <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">选择卡片背景</h3>
                  <div className="mb-4 grid grid-cols-5 gap-2">{PRESET_BGS.map(bg => (
                    <button key={bg.key} onClick={() => handleBgChange({ type: 'preset', value: bg.key })}
                      className="group relative aspect-[3/2] rounded-xl overflow-hidden shadow-sm ring-2 ring-transparent transition-all hover:ring-primary-400 active:scale-95"
                      style={{ background: bg.css }} title={bg.name}>
                      {cardBg.type === 'preset' && cardBg.value === bg.key && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Check size={16} className="text-white drop-shadow" /></div>}
                    </button>
                  ))}</div>
                  <button onClick={() => bgFileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 dark:border-gray-700 dark:text-gray-400"><Upload size={16} />从图库选择图片</button>
                  <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
                  <button onClick={() => setShowBgPicker(false)}
                    className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">取消</button>
                </motion.div>
              </motion.div>
            )}</AnimatePresence>

            <div className="mb-5 flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSheet(true)}
                className="glass-card flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white"><Plus size={14} /></span>记一笔
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/notes')}
                className="glass-card flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white"><StickyNote size={14} /></span>随手记
              </motion.button>
            </div>

            <div className="mb-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-200"><span className="sticker-emoji text-sm">🧾</span>最近账目</h2>
                <button onClick={() => navigate('/accounting')} className="flex items-center gap-0.5 text-xs text-primary-500">查看全部 <ArrowRight size={14} /></button>
              </div>
              {recentTxs.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">还没有账目记录</p> : (
                <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-1.5">
                  {recentTxs.map(tx => (
                    <motion.div key={tx.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
                      whileHover={{ scale: 1.01, x: 2 }} className="glass-card flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={"h-2 w-2 rounded-full " + (tx.type === 'expense' ? 'bg-red-400' : 'bg-primary-400')} />
                        <span className="text-xs text-gray-500">{tx.note || tx.date.slice(5)}</span>
                      </div>
                      <span className={"text-sm font-semibold " + (tx.type === 'expense' ? 'text-red-500' : 'text-primary-600')}>{tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-200"><span className="sticker-emoji text-sm">📖</span>最近记事</h2>
                <button onClick={() => navigate('/notes')} className="flex items-center gap-0.5 text-xs text-primary-500">查看全部 <ArrowRight size={14} /></button>
              </div>
              {notes.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">还没有笔记</p> : (
                <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-1.5">
                  {notes.map(note => (
                    <motion.div key={note.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
                      className="glass-card px-3 py-2.5">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">{note.title || note.content}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{dayjs(note.updatedAt).format('M/D HH:mm')}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </>
        )}

        <FloatingActionButton icon={<Plus size={24} />} onClick={() => setShowSheet(true)} gradient="primary" />
        <AddTransactionSheet open={showSheet} onClose={() => setShowSheet(false)} onSaved={loadData} editTx={null} />
      </div>
    </PageTransition>
  );
}
