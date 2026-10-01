import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowDownUp, Pencil, Trash2, Search, ListFilter, ChevronDown } from 'lucide-react';
import type { Transaction, Category } from '../types';
import { getTransactionsByMonth, getTransactionsByYear, getAllTransactions, deleteTransaction, getCategories } from '../db/database';
import { formatAmount, formatDate, getCurrentMonth } from '../utils/format';
import { PageTransition } from '../components/Layout';
import MonthPicker from '../components/MonthPicker';
import AddTransactionSheet from '../components/AddTransactionSheet';
import AnimatedNumber from '../components/AnimatedNumber';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';
import CategoryIcon from '../components/CategoryIcon';
import { getBubuCategoryArt } from '../utils/categoryArt';
import dayjs from 'dayjs';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category-asc' | 'category-desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-desc', label: '日期：最新' },
  { value: 'date-asc', label: '日期：最早' },
  { value: 'amount-desc', label: '金额：从高到低' },
  { value: 'amount-asc', label: '金额：从低到高' },
  { value: 'category-asc', label: '分类：正序' },
  { value: 'category-desc', label: '分类：倒序' },
];

export default function Accounting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const { year: cy, month: cm } = getCurrentMonth();
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const typeParam = searchParams.get('type');
  const typeFilter: 'all' | 'income' | 'expense' = typeParam === 'income' || typeParam === 'expense' ? typeParam : 'all';

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    let txs: Transaction[];
    if (viewMode === 'month') {
      txs = await getTransactionsByMonth(year, month);
    } else {
      txs = await getTransactionsByYear(year);
    }
    setTransactions(txs);
    if (!silent) setLoading(false);
  }, [year, month, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await deleteTransaction(id);
      loadData(true);
    }
  };
  const handleEdit = (tx: Transaction) => {
    setEditTx({ id: tx.id, type: tx.type, amount: tx.amount, categoryId: tx.categoryId, date: tx.date, note: tx.note });
    setShowSheet(true);
  };

  const setTypeFilter = (value: 'all' | 'income' | 'expense') => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('type');
    else next.set('type', value);
    setSearchParams(next, { replace: true });
  };

  const catMap = new Map(categories.map(c => [c.id!, c]));
  const q = search.trim().toLowerCase();
  const typeFiltered = typeFilter === 'all' ? transactions : transactions.filter(tx => tx.type === typeFilter);
  const filtered = q ? typeFiltered.filter(tx => {
    const cat = catMap.get(tx.categoryId);
    const nameMatch = !!cat && cat.name.toLowerCase().includes(q);
    const noteMatch = (tx.note || '').toLowerCase().includes(q);
    return nameMatch || noteMatch;
  }) : typeFiltered;

  const compareByDate = (a: Transaction, b: Transaction) =>
    b.date.localeCompare(a.date) ||
    b.createdAt.localeCompare(a.createdAt) ||
    (b.id ?? 0) - (a.id ?? 0);
  const compareCategory = (a: Transaction, b: Transaction) => {
    const aName = catMap.get(a.categoryId)?.name ?? '未分类';
    const bName = catMap.get(b.categoryId)?.name ?? '未分类';
    return aName.localeCompare(bName, 'zh-CN', { sensitivity: 'base' });
  };
  const sortedTransactions = sortOption === 'date-desc' || sortOption === 'date-asc'
    ? filtered
    : [...filtered].sort((a, b) => {
      if (sortOption === 'amount-desc') return b.amount - a.amount || compareByDate(a, b);
      if (sortOption === 'amount-asc') return a.amount - b.amount || compareByDate(a, b);
      const categoryOrder = compareCategory(a, b);
      return (sortOption === 'category-desc' ? -categoryOrder : categoryOrder) || compareByDate(a, b);
    });
  const useDateGroups = sortOption === 'date-desc' || sortOption === 'date-asc';
  const grouped = sortedTransactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => sortOption === 'date-asc' ? a.localeCompare(b) : b.localeCompare(a));
  const filteredIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const filteredExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const renderTransaction = (tx: Transaction, showDate = false) => {
    const cat = catMap.get(tx.categoryId);
    const artPath = cat && document.documentElement.dataset.theme === 'bubu'
      ? getBubuCategoryArt(cat.type, cat.icon)
      : undefined;
    return (
      <motion.div key={tx.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
        className="glass-card flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {showDate && <span className="shrink-0 text-xs text-gray-400">{formatDate(tx.date)}</span>}
          {cat && (
            <div className="flex min-w-0 items-center gap-1.5">
              {artPath ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: `${cat.color}20` }}>
                  <img src={artPath} alt="" className="h-full w-full object-contain" />
                </span>
              ) : (
                <CategoryIcon iconName={cat.icon || 'circle'} color={cat.color} size={18} className="h-8 w-8 shrink-0" />
              )}
              <span className="truncate text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
            </div>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className={"shrink-0 text-sm font-semibold "+(tx.type==='expense'?'text-red-500':'text-primary-600')}>
            {tx.type==='expense'?'-':'+'}¥{formatAmount(tx.amount)}
          </span>
          {tx.note && <span className="max-w-[100px] truncate text-xs text-gray-400">{tx.note}</span>}
          <button onClick={() => handleEdit(tx)} className="rounded-full bg-gray-100/80 p-1.5 text-gray-400 hover:bg-primary-100 hover:text-primary-500 dark:bg-gray-700/80 dark:hover:bg-gray-600"><Pencil size={14}/></button>
          <button onClick={() => handleDelete(tx.id!)} className="rounded-full bg-gray-100/80 p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-400 dark:bg-gray-700/80 dark:hover:bg-gray-600"><Trash2 size={14}/></button>
        </div>
      </motion.div>
    );
  };

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 page-title"><span className="sticker-emoji text-base">💰</span>记账</h1>
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
            className="control-surface rounded-lg border p-2 text-gray-500 shadow-sm"
            title={viewMode === 'month' ? '按年查看' : '按月查看'}
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {viewMode === 'month' ? (
          <div className="mb-4"><MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} /></div>
        ) : (
          <div className="mb-4">
            <div className="glass-card flex items-center justify-between px-4 py-2.5">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setYear(year - 1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </motion.button>
              <motion.span key={year} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold text-gray-800 dark:text-gray-200">{year}年</motion.span>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setYear(year + 1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </motion.button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-stretch gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索备注、分类..." className="input-field pl-9" />
          </div>
          <label className="relative w-[142px] shrink-0">
            <ListFilter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="账目排序"
              className="control-surface h-full min-h-[48px] w-full appearance-none rounded-2xl border pl-9 pr-2 text-xs outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </label>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100/80 p-1 dark:bg-gray-800/80">
          {([
            ['all', '全部'],
            ['income', '收入'],
            ['expense', '支出'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                typeFilter === value
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!loading && filtered.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setTypeFilter('income')}
              className="accounting-total-card accounting-total-card--income flex-1 p-3 text-left"
              title="只看收入账目"
            >
              <p className="text-xs opacity-75">收入</p>
              <p className="mt-1 text-lg font-bold"><AnimatedNumber value={filteredIncome} format={formatAmount} /></p>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setTypeFilter('expense')}
              className="accounting-total-card accounting-total-card--expense flex-1 p-3 text-left"
              title="只看支出账目"
            >
              <p className="text-xs opacity-75">支出</p>
              <p className="mt-1 text-lg font-bold"><AnimatedNumber value={filteredExpense} format={formatAmount} /></p>
            </motion.button>
            <div className="accounting-total-card accounting-total-card--balance flex-1 p-3">
              <p className="text-xs opacity-75">结余</p>
              <p className={"mt-1 text-lg font-bold " + (filteredIncome - filteredExpense >= 0 ? '' : '')}><AnimatedNumber value={filteredIncome - filteredExpense} format={formatAmount} /></p>
            </div>
          </motion.div>
        )}

        {loading ? <ListSkeleton count={5} /> : transactions.length === 0 ? (
          <EmptyState title="暂无记录" description="点击右下角 + 记下第一笔吧" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={48} />} title="没有找到匹配的记录" description="换个关键词试试" />
        ) : useDateGroups ? (
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
                  {grouped[date].map((tx) => renderTransaction(tx))}
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTransactions.map((tx) => renderTransaction(tx, true))}
          </div>
        )}

        <FloatingActionButton icon={<Plus size={24} />} onClick={() => { setEditTx(null); setShowSheet(true); }} gradient="primary" />

        <AddTransactionSheet open={showSheet} onClose={() => { setShowSheet(false); setEditTx(null); }} onSaved={() => loadData(true)} editTx={editTx} />
      </div>
    </PageTransition>
  );
}
