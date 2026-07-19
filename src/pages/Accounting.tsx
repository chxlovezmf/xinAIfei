import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowDownUp, Pencil, Trash2 } from 'lucide-react';
import type { Transaction, Category } from '../types';
import { getTransactionsByMonth, getTransactionsByYear, getAllTransactions, deleteTransaction, getCategories } from '../db/database';
import { formatAmount, formatDate, getCurrentMonth } from '../utils/format';
import { PageTransition } from '../components/Layout';
import MonthPicker from '../components/MonthPicker';
import AddTransactionSheet from '../components/AddTransactionSheet';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

export default function Accounting() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const { year: cy, month: cm } = getCurrentMonth();
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    let txs: Transaction[];
    if (viewMode === 'month') {
      txs = await getTransactionsByMonth(year, month);
    } else {
      txs = await getTransactionsByYear(year);
    }
    setTransactions(txs);
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    setTotalIncome(inc);
    setTotalExpense(exp);
    setLoading(false);
  }, [year, month, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => { await deleteTransaction(id); loadData(); };
  const handleEdit = (tx: Transaction) => {
    setEditTx({ id: tx.id, type: tx.type, amount: tx.amount, categoryId: tx.categoryId, date: tx.date, note: tx.note });
    setShowSheet(true);
  };

  const catMap = new Map(categories.map(c => [c.id!, c]));
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="page-title">记账</h1>
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
            className="rounded-lg bg-white p-2 text-gray-500 shadow-sm dark:bg-gray-800"
            title={viewMode === 'month' ? '按年查看' : '按月查看'}
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {viewMode === 'month' ? (
          <div className="mb-4"><MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} /></div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-gray-800">
              <button
                onClick={() => setYear(year - 1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{year}年</span>
              <button
                onClick={() => setYear(year + 1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex gap-3">
            <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"><p className="text-xs text-gray-500">收入</p><p className="mt-1 text-lg font-bold text-primary-600">¥{formatAmount(totalIncome)}</p></div>
            <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"><p className="text-xs text-gray-500">支出</p><p className="mt-1 text-lg font-bold text-red-500">¥{formatAmount(totalExpense)}</p></div>
            <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"><p className="text-xs text-gray-500">结余</p><p className={`mt-1 text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-primary-600' : 'text-red-500'}`}>¥{formatAmount(totalIncome - totalExpense)}</p></div>
          </motion.div>
        )}

        {loading ? <ListSkeleton count={5} /> : transactions.length === 0 ? (
          <EmptyState title="暂无记录" description="点击右下角 + 记下第一笔吧" />
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dayExpense = grouped[date].filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">{formatDate(date)}<span className="ml-2 text-xs text-gray-400">{dayjs(date).format('ddd')}</span></span>
                    {dayExpense > 0 && (
                      <span className="text-xs font-medium text-red-400">支出 ¥{formatAmount(dayExpense)}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{grouped[date].length}笔</span>
                </div>
                <div className="space-y-2">
                  {grouped[date].map((tx) => {
                    const cat = catMap.get(tx.categoryId);
                    return (
                      <motion.div key={tx.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                          {cat && (
                            <div className="flex items-center gap-1.5">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={"text-sm font-semibold "+(tx.type==='expense'?'text-red-500':'text-primary-600')}>
                            {tx.type==='expense'?'-':'+'}¥{formatAmount(tx.amount)}
                          </span>
                          {tx.note && <span className="max-w-[100px] truncate text-xs text-gray-400">{tx.note}</span>}
                          <button onClick={() => handleEdit(tx)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(tx.id!)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700"><Trash2 size={14}/></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )})}
          </div>
        )}

        <button onClick={() => { setEditTx(null); setShowSheet(true); }}
          className="fixed bottom-20 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg active:scale-90 transition-transform">
          <Plus size={24} />
        </button>

        <AddTransactionSheet open={showSheet} onClose={() => { setShowSheet(false); setEditTx(null); }} onSaved={loadData} editTx={editTx} />
      </div>
    </PageTransition>
  );
}
