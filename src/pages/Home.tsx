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

type CardBackground = { type: 'preset' | 'image'; value: string };

const PRESET_BGS = [
  { key: 'bubu', name: '布布一二', css: "linear-gradient(90deg, rgba(75, 49, 38, 0.82), rgba(75, 49, 38, 0.12)), url('/themes/bubu/home-background.png') center 88% / cover no-repeat" },
  { key: 'teal', name: '青绿', css: 'var(--gradient-teal)' },
  { key: 'purple', name: '紫韵', css: 'var(--gradient-purple)' },
  { key: 'rose', name: '玫瑰', css: 'var(--gradient-rose)' },
  { key: 'blue', name: '海蓝', css: 'var(--gradient-blue)' },
  { key: 'amber', name: '落日', css: 'var(--gradient-amber)' },
  { key: 'emerald', name: '翠绿', css: 'var(--gradient-emerald)' },
  { key: 'indigo', name: '靛青', css: 'var(--gradient-indigo)' },
  { key: 'pink', name: '粉黛', css: 'var(--gradient-pink)' },
  { key: 'slate', name: '星空', css: 'var(--gradient-slate)' },
  { key: 'orange', name: '暖阳', css: 'var(--gradient-orange)' },
];

const APP_VERSION = '1.5.1';

function loadCardBg(): CardBackground {
  try {
    const raw = localStorage.getItem('cardBg');
    if (raw) {
      const parsed = JSON.parse(raw) as CardBackground;
      if (parsed.type === 'image' || !parsed.value.startsWith('bubu-card-')) return parsed;
    }
  } catch {}
  return { type: 'preset', value: 'teal' };
}

function resolveBgCss(bg: CardBackground): string {
  if (bg.type === 'image') return "url('" + bg.value + "') center/cover no-repeat";
  const found = PRESET_BGS.find(b => b.key === bg.value);
  return found ? found.css : 'var(--gradient-teal)';
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
  const [cardBg, setCardBg] = useState<CardBackground>(loadCardBg);
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

  const handleBgChange = (newBg: CardBackground) => { setCardBg(newBg); setShowBgPicker(false); };

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
  const isBubuCardBg = false;

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 dark:text-gray-100"><span className="sticker-emoji text-base">📓</span>鑫菲日记</h1>
            <p className="text-xs text-gray-400">{dayjs().format('M月D日 dddd')}</p>
          </div>
          <div className="rounded-full bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 p-[2px] shadow-sm">
            <button onClick={() => fileInputRef.current?.click()} aria-label="更换头像"
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
              className={`relative mb-5 overflow-hidden rounded-3xl p-5 shadow-lg ${isBubuCardBg ? 'text-[#49372e]' : 'text-white'}`} style={{ background: resolveBgCss(cardBg) }}>
              {cardBg.type === 'image' && <div className="absolute inset-0 bg-black/40" />}
              {!isBubuCardBg && <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-2xl" />}
              {!isBubuCardBg && <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />}
              {!isBubuCardBg && <span className="absolute right-14 top-3 text-xl animate-float" style={{ animationDuration: '5s' }}>💖</span>}
              {!isBubuCardBg && <span className="absolute bottom-16 left-4 text-lg animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>✨</span>}
              <div className="relative z-10">
                {editingTitle ? (
                  <input type="text" value={cardTitle} onChange={e => setCardTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                    className={`w-full rounded px-2 py-0.5 text-sm outline-none ${isBubuCardBg ? 'bg-white/70 text-[#49372e] placeholder:text-[#9b8879]' : 'bg-white/20 text-white placeholder-white/50'}`} placeholder="输入标题" autoFocus />
                ) : (
                  <p className={`cursor-pointer text-sm transition-colors ${isBubuCardBg ? 'text-[#856044] hover:text-[#49372e]' : 'text-primary-100 hover:text-white'}`} onClick={() => setEditingTitle(true)} title="点击编辑标题">{cardTitle}</p>
                )}
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {monthIncome - monthExpense >= 0 ? '' : '-'}<AnimatedNumber value={Math.abs(monthIncome - monthExpense)} format={formatAmount} />
                </p>
                <div className="mt-4 flex gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/accounting?type=income')}
                    className={`uiverse-glow-card flex flex-1 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-left transition-colors ${isBubuCardBg ? 'bg-white/70 hover:bg-white/90' : 'bg-white/20 hover:bg-white/30'}`}
                    title="查看收入账目"
                  >
                    <div className={`rounded-full p-1 ${isBubuCardBg ? 'bg-[#d9b18b]/40' : 'bg-white/25'}`}><TrendingUp size={14} /></div>
                    <div><p className={`text-[11px] ${isBubuCardBg ? 'text-[#8d6b55]' : 'text-primary-100'}`}>收入</p><p className="text-sm font-semibold"><AnimatedNumber value={monthIncome} format={formatAmount} /></p></div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/accounting?type=expense')}
                    className={`uiverse-glow-card flex flex-1 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-left transition-colors ${isBubuCardBg ? 'bg-white/70 hover:bg-white/90' : 'bg-white/20 hover:bg-white/30'}`}
                    title="查看支出账目"
                  >
                    <div className={`rounded-full p-1 ${isBubuCardBg ? 'bg-[#d9b18b]/40' : 'bg-white/25'}`}><TrendingDown size={14} /></div>
                    <div><p className={`text-[11px] ${isBubuCardBg ? 'text-[#8d6b55]' : 'text-primary-100'}`}>支出</p><p className="text-sm font-semibold"><AnimatedNumber value={monthExpense} format={formatAmount} /></p></div>
                  </motion.button>
                </div>
                <div className={`mt-3 border-t pt-3 ${isBubuCardBg ? 'border-[#9b755d]/25' : 'border-white/25'}`}>
                  <div className={`flex justify-between text-xs ${isBubuCardBg ? 'text-[#8d6b55]' : 'text-primary-100'}`}>
                    <span>今日支出 <strong className={isBubuCardBg ? 'text-[#49372e]' : 'text-white'}><AnimatedNumber value={todayExpense} format={formatAmount} /></strong></span>
                    <span>今日收入 <strong className={isBubuCardBg ? 'text-[#49372e]' : 'text-white'}><AnimatedNumber value={todayIncome} format={formatAmount} /></strong></span>
                  </div>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setShowBgPicker(true); }} aria-label="更换卡片背景"
                className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-white/90 transition-all hover:bg-white/35 hover:text-white" title="更换背景"><Image size={14} /></button>
            </motion.div>

            <AnimatePresence>{showBgPicker && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBgPicker(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="modal-surface w-full max-w-sm rounded-2xl border p-5 shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">选择卡片背景</h3>
                  <div className="mb-4 grid grid-cols-5 gap-2">{PRESET_BGS.map(bg => (
                    <button key={bg.key} onClick={() => handleBgChange({ type: 'preset', value: bg.key })} aria-label={`选择${bg.name}背景`}
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
