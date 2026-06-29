import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Wallet, StickyNote, ArrowRight } from 'lucide-react';
import type { Transaction, Note } from '../types';
import { getCategories, getTransactionsByMonth, getAllNotes } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { PageTransition } from '../components/Layout';
import AddTransactionSheet from '../components/AddTransactionSheet';
import { ListSkeleton, CardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

export default function Home() {
  const navigate = useNavigate();
  const { year, month } = getCurrentMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);

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

  // Today's transactions
  const today = dayjs().format('YYYY-MM-DD');
  const todayTxs = transactions.filter((t) => t.date === today);
  const todayExpense = todayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayIncome = todayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Monthly totals
  const monthExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Recent transactions (last 5, all time)
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
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm dark:bg-primary-900/30 dark:text-primary-400">
            记
          </div>
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
              className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-lg"
            >
              <p className="text-sm text-primary-100">本月结余</p>
              <p className="mt-1 text-3xl font-bold">¥{formatAmount(monthIncome - monthExpense)}</p>
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full bg-white/20 p-1">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-primary-100">收入</p>
                    <p className="text-sm font-semibold">¥{formatAmount(monthIncome)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full bg-white/20 p-1">
                    <TrendingDown size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-primary-100">支出</p>
                    <p className="text-sm font-semibold">¥{formatAmount(monthExpense)}</p>
                  </div>
                </div>
              </div>
              {/* Today */}
              <div className="mt-3 border-t border-white/20 pt-3">
                <div className="flex justify-between text-xs text-primary-100">
                  <span>今日支出 <strong className="text-white">¥{formatAmount(todayExpense)}</strong></span>
                  <span>今日收入 <strong className="text-white">¥{formatAmount(todayIncome)}</strong></span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="mb-5 flex gap-3">
              <button
                onClick={() => { setShowSheet(true); }}
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
                      <span className={`text-sm font-semibold ${
                        tx.type === 'expense' ? 'text-red-500' : 'text-primary-600'
                      }`}>
                        {tx.type === 'expense' ? '-' : '+'}¥{formatAmount(tx.amount)}
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

        {/* FAB for quick add */}
        <button
          onClick={() => { setShowSheet(true); }}
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
