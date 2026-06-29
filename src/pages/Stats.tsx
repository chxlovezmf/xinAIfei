import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import type { Transaction, Category } from '../types';
import { getTransactionsByMonth, getCategories } from '../db/database';
import { formatAmount, getCurrentMonth } from '../utils/format';
import { exportToExcel } from '../utils/export';
import { PageTransition } from '../components/Layout';
import MonthPicker from '../components/MonthPicker';
import { CardSkeleton } from '../components/Skeleton';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

export default function Stats() {
  const { year: cy, month: cm } = getCurrentMonth();
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txs, cats] = await Promise.all([
      getTransactionsByMonth(year, month),
      getCategories(),
    ]);
    setTransactions(txs);
    setCategories(cats);
    setLoading(false);
  }, [year, month]);

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

  // Doughnut chart
  const doughnutData = {
    labels: expenseCatData.map(d => d.cat?.name || '未知'),
    datasets: [{
      data: expenseCatData.map(d => d.amount),
      backgroundColor: expenseCatData.map(d => d.cat?.color || '#ccc'),
      borderWidth: 0,
    }],
  };

  // Daily trend
  const dailyMap: Record<string, number> = {};
  expenseTxs.forEach(tx => {
    dailyMap[tx.date] = (dailyMap[tx.date] || 0) + tx.amount;
  });
  // Generate all days of month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyLabels: string[] = [];
  const dailyValues: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dailyLabels.push(String(d));
    dailyValues.push(dailyMap[dateStr] || 0);
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
      pointRadius: 3,
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
    exportToExcel(transactions, categories, year, month);
  };

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

        <div className="mb-4">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <div className="h-48 rounded-2xl bg-white" />
            <div className="h-32 rounded-2xl bg-white" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            本月没有数据，记几笔再来看看吧
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
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cat?.color }} />
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
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
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
