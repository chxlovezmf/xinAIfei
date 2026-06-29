import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Category } from '../types';
import { getCategories, addTransaction, updateTransaction } from '../db/database';
import { getTodayStr } from '../utils/format';
import CategoryIcon from './CategoryIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTx?: {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    categoryId: number;
    date: string;
    note: string;
  } | null;
}

export default function AddTransactionSheet({ open, onClose, onSaved, editTx }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(getTodayStr());
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<'amount' | 'category'>('amount');

  useEffect(() => {
    if (open) {
      getCategories().then(setCategories);
      if (editTx) {
        setType(editTx.type);
        setAmount(String(editTx.amount));
        setCategoryId(editTx.categoryId);
        setDate(editTx.date);
        setNote(editTx.note);
        setStep('category');
      } else {
        setType('expense');
        setAmount('');
        setCategoryId(null);
        setDate(getTodayStr());
        setNote('');
        setStep('amount');
      }
    }
  }, [open, editTx]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleNumberInput = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
    } else if (key === '00') {
      if (amount !== '0') setAmount((prev) => prev + '00');
    } else {
      const newAmount = amount + key;
      if (!newAmount.startsWith('0') || newAmount.startsWith('0.')) {
        const parts = newAmount.split('.');
        if (parts.length < 2 || parts[1].length <= 2) {
          setAmount(newAmount);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!amount || !categoryId) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (editTx) {
      await updateTransaction(editTx.id, {
        type, amount: numAmount, categoryId, date, note,
      });
    } else {
      await addTransaction({
        type, amount: numAmount, categoryId, date, note, tags: [],
      });
    }

    onSaved();
    onClose();
  };

  const displayAmount = amount || '0';
  const formattedAmount = displayAmount.includes('.')
    ? displayAmount
    : displayAmount + (step === 'amount' ? '' : '').toString();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ translateY: '100%' }}
            animate={{ translateY: 0 }}
            exit={{ translateY: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-24 dark:bg-gray-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {editTx ? '编辑账目' : '记一笔'}
              </span>
              <div className="w-8" />
            </div>

            {/* Type Toggle */}
            <div className="flex justify-center gap-2 px-5 py-3">
              <button
                onClick={() => { setType('expense'); setCategoryId(null); }}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                  type === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => { setType('income'); setCategoryId(null); }}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                  type === 'income'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                收入
              </button>
            </div>

            {step === 'amount' ? (
              <>
                {/* Amount Display */}
                <div className="px-5 py-2 text-center">
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-2xl mr-1">¥</span>
                    {formattedAmount}
                  </div>
                </div>

                {/* Note Input */}
                <div className="px-5 pb-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="添加备注..."
                    className="input-field text-center text-sm"
                  />
                </div>

                {/* Date Input */}
                <div className="px-5 pb-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); }}
                    className="input-field text-sm"
                  />
                </div>

                {/* Number Pad */}
                <div className="px-4 pt-1">
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleNumberInput(String(n))}
                        className="rounded-xl bg-gray-50 py-3 text-xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => handleNumberInput('.')}
                      className="rounded-xl bg-gray-50 py-3 text-xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                    >
                      .
                    </button>
                    <button
                      onClick={() => handleNumberInput('0')}
                      className="rounded-xl bg-gray-50 py-3 text-xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleNumberInput('00')}
                      className="rounded-xl bg-gray-50 py-3 text-base font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                    >
                      00
                    </button>
                    <button
                      onClick={() => handleNumberInput('backspace')}
                      className="rounded-xl bg-gray-50 py-3 text-xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                    >
                      ⌫
                    </button>
                  </div>
                  <button
                    onClick={() => amount && parseFloat(amount) > 0 ? setStep('category') : null}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="btn-primary mt-3 w-full text-base"
                  >
                    下一步
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Amount Summary */}
                <div className="px-5 py-2 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-lg mr-1">¥</span>
                    {formattedAmount}
                  </div>
                  {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
                </div>

                {/* Category Grid */}
                <div className="max-h-52 overflow-y-auto px-5 scrollbar-hide">
                  <div className="grid grid-cols-4 gap-3">
                    {currentCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id!)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all active:scale-95 ${
                          categoryId === cat.id
                            ? 'bg-primary-50 ring-2 ring-primary-400 dark:bg-primary-900/30'
                            : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                        }`}
                      >
                        <CategoryIcon iconName={cat.icon} color={cat.color} size={22} className="p-0 bg-transparent" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 text-center leading-tight">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-5 pt-4">
                  <button
                    onClick={() => setStep('amount')}
                    className="btn-secondary flex-1"
                  >
                    返回修改
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!categoryId}
                    className="btn-primary flex-1"
                  >
                    {editTx ? '保存修改' : '确认添加'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
