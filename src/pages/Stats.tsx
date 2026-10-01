import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Download, Calendar, X, Pencil, Check } from 'lucide-react';
import type { Transaction, Category } from '../types';
import { getTransactionsByMonth, getCategories, getTransactionsByDateRange, getBalanceSnapshot, getCurrentBalance, setBalanceSnapshot } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { exportToExcel } from '../utils/export';
import { PageTransition } from '../components/Layout';
import MonthPicker from '../components/MonthPicker';
import AnimatedNumber from '../components/AnimatedNumber';
import { CardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// A set of visually distinct colors for the chart
const CHART_COLORS = [
  '#14b8a6', '#a855f7', '#ec4899', '#f59e0b',
  '#3b82f6', '#22c55e', '#ef4444', '#6366f1',
  '#06b6d4', '#84cc16', '#fb923c', '#f43f5e',
  '#0ea5e9', '#10b981', '#eab308', '#8b5cf6',
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
  const navigate = useNavigate();
  const { year: cy, month: cm } = getCurrentMonth();
  const [viewMode, setViewMode] = useState<'month' | 'range'>('month');
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [rangeStart, setRangeStart] = useState(() => dayjs().startOf('year').format('YYYY-MM-DD'));
  const [rangeEnd, setRangeEnd] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [editingBalance, setEditingBalance] = useState(false);
  const chartRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cats, snapshot, currentBalance] = await Promise.all([getCategories(), getBalanceSnapshot(), getCurrentBalance()]);
    setCategories(cats);
    setBalance(snapshot ? currentBalance : null);
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

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const tooltipBg = isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.95)';
  const tooltipText = isDark ? '#f3f4f6' : '#111827';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';

  const lineData = {
    labels: dailyLabels,
    datasets: [{
      label: '每日支出',
      data: dailyValues,
      borderColor: '#14b8a6',
      backgroundColor: (context: any) => {
        const { chart } = context;
        const { ctx, chartArea } = chart;
        if (!chartArea) return 'rgba(20,184,166,0.1)';
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(20,184,166,0.35)');
        g.addColorStop(1, 'rgba(20,184,166,0.02)');
        return g;
      },
      fill: true,
      tension: 0.4,
      pointRadius: dailyValues.map(v => v > 0 ? 5 : 0),
      pointHoverRadius: 8,
      pointBackgroundColor: '#14b8a6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
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
    animation: { duration: 900, easing: 'easeOutQuart' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        boxPadding: 4,
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const label = dailyLabels[idx];
        // Parse M/D back to full date
        const parts = label.split('/');
        let fullDate = '';
        if (viewMode === 'month') {
          fullDate = `${year}-${String(month).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
        } else {
          // For range mode, calculate from start
          fullDate = dayjs(rangeStart).add(idx, 'day').format('YYYY-MM-DD');
        }
        if (dailyMap[fullDate]) {
          setSelectedDay(fullDate);
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 31 } },
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { font: { size: 10 } } },
    },
  };

  const handleExport = () => {
    if (viewMode === 'month') {
      void exportToExcel(transactions, categories, year, month);
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
      void import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '账目明细');
      ws['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 10 },
        { wch: 12 }, { wch: 20 }, { wch: 16 },
      ];
      const fileName = `鑫菲日记_账目_${rangeStart}_${rangeEnd}.xlsx`;
      XLSX.writeFile(wb, fileName);
      });
    }
  };

  const handleBalanceSave = async () => {
    const amount = Number(balanceDraft);
    if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) return;
    await setBalanceSnapshot(amount);
    setBalance(amount);
    setEditingBalance(false);
  };

  const periodLabel = viewMode === 'month'
    ? `${year}年${month}月`
    : `${rangeStart} ~ ${rangeEnd}`;

  // Selected day transactions for the popup
  const selectedDayTxs = selectedDay ? transactions.filter(t => t.date === selectedDay) : [];
  const selectedDayTotal = selectedDayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <PageTransition>
      <div className="page-container">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 page-title"><span className="sticker-emoji text-base">📊</span>统计</h1>
          <button
            onClick={handleExport}
            className="btn-secondary gap-1 py-2 px-4 text-sm"
          >
            <Download size={16} />
            导出 Excel
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-3 flex gap-1 rounded-full bg-gray-100/80 p-1 dark:bg-gray-800/80">
          <button
            onClick={() => setViewMode('month')}
            className={'relative flex-1 rounded-full py-1.5 text-xs font-medium transition-all ' +
              (viewMode === 'month' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500')}
          >
            {viewMode === 'month' && (
              <motion.div layoutId="stats-mode-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-700" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative">按月查看</span>
          </button>
          <button
            onClick={() => setViewMode('range')}
            className={'relative flex-1 rounded-full py-1.5 text-xs font-medium transition-all ' +
              (viewMode === 'range' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500')}
          >
            {viewMode === 'range' && (
              <motion.div layoutId="stats-mode-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-700" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative">自定义范围</span>
          </button>
        </div>

        {/* Date Selector */}
        {viewMode === 'month' ? (
          <div className="mb-4">
            <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          </div>
        ) : (
          <div className="glass-card mb-4 flex items-center gap-2 px-4 py-2.5">
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

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-4 flex items-center justify-between px-4 py-3"
        >
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">当前余额</p>
            {editingBalance ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">¥</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={balanceDraft}
                  onChange={e => setBalanceDraft(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                  onKeyDown={e => { if (e.key === 'Enter') void handleBalanceSave(); }}
                  className="w-32 border-b border-primary-400 bg-transparent text-lg font-semibold text-gray-800 outline-none dark:text-gray-100"
                />
              </div>
            ) : (
              <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {balance === null ? '未设置' : `¥${formatAmount(balance)}`}
              </p>
            )}
          </div>
          {editingBalance ? (
            <button onClick={() => void handleBalanceSave()} className="rounded-full bg-primary-500 p-2 text-white" title="保存余额"><Check size={17} /></button>
          ) : (
            <button onClick={() => { setBalanceDraft(balance === null ? '' : String(balance)); setEditingBalance(true); }} className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-primary-100 hover:text-primary-600 dark:bg-gray-700" title="编辑余额"><Pencil size={16} /></button>
          )}
        </motion.div>

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
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/accounting?type=income')}
                className="bubu-frame-card grad-card grad-teal grad-animated uiverse-glow-card flex-1 p-4 text-left"
                title="查看收入账目"
              >
                <p className="text-xs text-primary-100">总收入</p>
                <p className="mt-1 text-xl font-bold"><AnimatedNumber value={totalIncome} format={(n) => '¥' + formatAmount(n)} /></p>
              </motion.button>
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/accounting?type=expense')}
                className="bubu-frame-card grad-card grad-rose grad-animated uiverse-glow-card flex-1 p-4 text-left"
                title="查看支出账目"
              >
                <p className="text-xs text-red-100">总支出</p>
                <p className="mt-1 text-xl font-bold"><AnimatedNumber value={totalExpense} format={(n) => '¥' + formatAmount(n)} /></p>
              </motion.button>
            </div>

            {/* Pie Chart */}
            {expenseCatData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card mb-4 p-4"
              >
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">支出分类占比</h3>
                <div className="mx-auto h-56 w-56">
                  <Doughnut data={doughnutData} options={{
                    ...chartOptions,
                    plugins: {
                      legend: { display: false },
                    },
                  }} />
                </div>
                {/* Details - Scrollable list */}
                <div className="mt-3 max-h-48 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
                  {expenseCatData.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: catColorMap.get(String(d.id)) }} />
                        <span className="text-gray-600 dark:text-gray-400">{d.cat?.name}</span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200 shrink-0">
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
              className="glass-card mb-4 p-4"
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                每日支出趋势
                <span className="ml-2 text-xs font-normal text-gray-400">点击数据点查看详情</span>
              </h3>
              <div className="h-48">
                <Line ref={chartRef} data={lineData} options={lineChartOptions} />
              </div>
              {/* Selected day popup */}
              {selectedDay && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {selectedDay} ({dayjs(selectedDay).format('ddd')})
                    </span>
                    <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    当日支出合计: <span className="font-semibold text-red-500">¥{formatAmount(selectedDayTotal)}</span>
                  </p>
                  <div className="space-y-1.5">
                    {selectedDayTxs.filter(t => t.type === 'expense').map(tx => {
                      const cat = catMap.get(tx.categoryId);
                      return (
                        <div key={tx.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat?.color || '#ccc' }} />
                            <span className="text-gray-600 dark:text-gray-400">{cat?.name || '未知'}</span>
                            {tx.note && <span className="text-gray-400 truncate max-w-[120px]">{tx.note}</span>}
                          </div>
                          <span className="font-medium text-red-500">-¥{formatAmount(tx.amount)}</span>
                        </div>
                      );
                    })}
                    {selectedDayTxs.filter(t => t.type === 'income').length > 0 && (
                      <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-400 mb-1">收入</p>
                        {selectedDayTxs.filter(t => t.type === 'income').map(tx => {
                          const cat = catMap.get(tx.categoryId);
                          return (
                            <div key={tx.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat?.color || '#ccc' }} />
                                <span className="text-gray-600 dark:text-gray-400">{cat?.name || '未知'}</span>
                              </div>
                              <span className="font-medium text-primary-600">+¥{formatAmount(tx.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Income vs Expense Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4"
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
