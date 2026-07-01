import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Download, Calendar } from 'lucide-react';
import type { Transaction, Category } from '../types';
import { getTransactionsByMonth, getCategories, getTransactionsByDateRange } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { exportToExcel } from '../utils/export';
import * as XLSX from 'xlsx';
import { PageTransition } from '../components/Layout';
import { CardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// A set of visually distinct colors for the chart
const CHART_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e',
  '#0ea5e9', '#10b981', '#eab308', '#6366f1',
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Stats() {
  const { year: cy, month: cm } = getCurrentMonth();
  const [viewMode, setViewMode] = useState<'month' | 'range'>('month');
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [rangeStart, setRangeStart] = useState(() => dayjs().startOf('year').format('YYYY-MM-DD'));
  const [rangeEnd, setRangeEnd] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    let txs: Transaction[];
    if (viewMode === 'month') {
      txs = await getTransactionsByMonth(year, month);
    } else {
      txs = await getTransactionsByDateRange(rangeStart, rangeEnd);
    }
    setTransactions(txs);
    setLoading(false);
  }, [year, month, viewMode, rangeStart, rangeEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const catMap = new Map(categories.map(c => [c.id!, c]));
  const expenseTxs = transactions.filter(t => t.type === 'expense');
  const incomeTxs = transactions.filter(t => t.type === 'income');
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);

  // Expense by category
  const expenseByCat: Record<number, number> = {};
  expenseTxs.forEach(tx => {
    expenseByCat[tx.categoryId] = (expenseByCat[tx.categoryId] || 0) + tx.amount;
  });

  const expenseCatData = Object.entries(expenseByCat)
    .map(([id, amount]) => ({
      id: Number(id),
      amount,
      cat: catMap.get(Number(id)),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Generate random but deterministic colors for each category
  const catColorMap = new Map<string, string>();
  const shuffledColors = shuffleArray(CHART_COLORS);
  expenseCatData.forEach((d, i) => {
    catColorMap.set(String(d.id), shuffledColors[i % shuffledColors.length]);
  });

  // Doughnut chart
  const doughnutData = {
    labels: expenseCatData.map(d => d.cat?.name || '未知'),
    datasets: [{
      data: expenseCatData.map(d => d.amount),
      backgroundColor: expenseCatData.map(d => catColorMap.get(String(d.id)) || '#ccc'),
      borderWidth: 0,
    }],
  };

  // Daily trend
  const dailyMap: Record<string, number> = {};
  expenseTxs.forEach(tx => {
    dailyMap[tx.date] = (dailyMap[tx.date] || 0) + tx.amount;
  });

  // Generate days for the selected range
  const startDay = viewMode === 'month'
    ? dayjs(`${year}-${month}-01`)
    : dayjs(rangeStart);
  const endDay = viewMode === 'month'
    ? dayjs(`${year}-${month}-01`).endOf('month')
    : dayjs(rangeEnd);

  const dailyLabels: string[] = [];
  const dailyValues: number[] = [];
  let cursor = startDay;
  while (cursor.isBefore(endDay) || cursor.isSame(endDay, 'day')) {
    const dateStr = cursor.format('YYYY-MM-DD');
    dailyLabels.push(cursor.format('M/D'));
    dailyValues.push(dailyMap[dateStr] || 0);
    cursor = cursor.add(1, 'day');
  }

  const lineData = {
    labels: dailyLabels,
    datasets: [{
      label: '每日支出',
      data: dailyValues,
      borderColor: '#14b8a6',
      backgroundColor: 'rgba(20, 184, 166, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 1,
      pointBackgroundColor: '#14b8a6',
    }],
  };

  // Income vs Expense bar
  const barData = {
    labels: ['收支对比'],
    datasets: [
      { label: '收入', data: [totalIncome], backgroundColor: '#14b8a6', borderRadius: 6 },
      { label: '支出', data: [totalExpense], backgroundColor: '#ef4444', borderRadius: 6 },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };

  const handleExport = () => {
    if (viewMode === 'month') {
      exportToExcel(transactions, categories, year, month);
    } else {
      // Use range export
      const catMap = new Map(categories.map((c) => [c.id!, c]));
      const data = transactions.map((tx) => {
        const cat = catMap.get(tx.categoryId);
        return {
          '日期': tx.date,
          '类型': tx.type === 'expense' ? '支出' : '收入',
          '分类': cat?.name || '-',
          '金额': tx.type === 'expense' ? -tx.amount : tx.amount,
          '备注': tx.note || '',
          '创建时间': dayjs(tx.createdAt).format('YYYY-MM-DD HH:mm'),
        };
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '账目明细');
      ws['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 10 },
        { wch: 12 }, { wch: 20 }, { wch: 16 },
      ];
      const fileName = `记一记_账目_${rangeStart}_${rangeEnd}.xlsx`;
      XLSX.writeFile(wb, fileName);
    }
  };

  const periodLabel = viewMode === 'month'
    ? `${year}年${month}月`
    : `${rangeStart} ~ ${rangeEnd}`;

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="page-title">统计</h1>
          <button
            onClick={handleExport}
            className="btn-secondary gap-1 py-2 px-4 text-sm"
          >
            <Download size={16} />
            导出 Excel
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setViewMode('month')}
            className={'flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ' +
              (viewMode === 'month' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}
          >
            按月查看
          </button>
          <button
            onClick={() => setViewMode('range')}
            className={'flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ' +
              (viewMode === 'range' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-200' : 'text-gray-500')}
          >
            自定义范围
          </button>
        </div>

        {/* Date Selector */}
        {viewMode === 'month' ? (
          <div className="mb-4">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-gray-800">
              <button
                onClick={() => {
                  if (month === 1) { setYear(year - 1); setMonth(12); }
                  else setMonth(month - 1);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {year}年{month}月
              </span>
              <button
                onClick={() => {
                  if (month === 12) { setYear(year + 1); setMonth(1); }
                  else setMonth(month + 1);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-gray-800">
            <Calendar size={16} className="text-gray-400 shrink-0" />
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-gray-700 outline-none dark:text-gray-300 [color-scheme:light] dark:[color-scheme:dark]"
            />
            <span className="text-xs text-gray-400">至</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-gray-700 outline-none dark:text-gray-300 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <div className="h-48 rounded-2xl bg-white" />
            <div className="h-32 rounded-2xl bg-white" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            当前范围没有数据，记几笔再来看看吧
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-4 flex gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white shadow-sm"
              >
                <p className="text-xs text-primary-100">总收入</p>
                <p className="mt-1 text-xl font-bold">¥{formatAmount(totalIncome)}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex-1 rounded-2xl bg-gradient-to-br from-red-400 to-red-500 p-4 text-white shadow-sm"
              >
                <p className="text-xs text-red-100">总支出</p>
                <p className="mt-1 text-xl font-bold">¥{formatAmount(totalExpense)}</p>
              </motion.div>
            </div>

            {/* Pie Chart */}
            {expenseCatData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
              >
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">支出分类占比</h3>
                <div className="mx-auto h-56 w-56">
                  <Doughnut data={doughnutData} options={{
                    ...chartOptions,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 12 },
                      },
                    },
                  }} />
                </div>
                {/* Details */}
                <div className="mt-3 space-y-1.5">
                  {expenseCatData.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: catColorMap.get(String(d.id)) }} />
                        <span className="text-gray-600 dark:text-gray-400">{d.cat?.name}</span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ¥{formatAmount(d.amount)}
                        <span className="ml-1 text-gray-400">
                          ({totalExpense > 0 ? Math.round(d.amount / totalExpense * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Daily Trend */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">每日支出趋势</h3>
              <div className="h-48">
                <Line data={lineData} options={{
                  ...chartOptions,
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: viewMode === 'range' ? 31 : 31 } },
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 } } },
                  },
                }} />
              </div>
            </motion.div>

            {/* Income vs Expense Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">收支对比</h3>
              <div className="h-32">
                <Bar data={barData} options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  scales: {
                    x: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false } },
                  },
                }} />
              </div>
            </motion.div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
