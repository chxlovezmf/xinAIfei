import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Category } from '../types';
import { getCategories, addTransaction, updateTransaction } from '../db/database';
import { getTodayStr } from '../utils/format';

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
  const noteInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState('85dvh');

  // When keyboard opens/closes, adjust sheet height to viewport
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setMaxH(vv.height - 56 + 'px');
    update();
    vv.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      setMaxH('85dvh');
    };
  }, [open]);

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

  // Scroll note into view when focused
  const handleNoteFocus = () => {
    setTimeout(() => {
      noteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleNumberInput = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        if (amount === '') setAmount('0.');
        else setAmount((prev) => prev + '.');
      }
    } else if (key === '00') {
      if (amount !== '' && amount !== '0') setAmount((prev) => prev + '00');
    } else {
      const newAmount = amount + key;
      if (newAmount.startsWith('0') && !newAmount.startsWith('0.') && newAmount !== '0') return;
      const parts = newAmount.split('.');
      if (parts.length < 2 || parts[1].length <= 2) setAmount(newAmount);
    }
  };

  const handleSave = async () => {
    if (!amount || !categoryId) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (editTx) {
      await updateTransaction(editTx.id, { type, amount: numAmount, categoryId, date, note });
    } else {
      await addTransaction({ type, amount: numAmount, categoryId, date, note, tags: [] });
    }
    onSaved();
    onClose();
  };

  const displayAmount = amount || '0';
  const formattedAmount = displayAmount.includes('.')
    ? displayAmount
    : displayAmount;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ translateY: '100%' }}
            animate={{ translateY: 0 }}
            exit={{ translateY: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl bg-white dark:bg-gray-800"
            style={{ height: maxH, maxHeight: '95dvh' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {editTx ? '编辑账目' : '记一笔'}
              </span>
              <div className="w-8" />
            </div>

            {/* Body: amount step scrollable, category step flex layout */}
            <div ref={bodyRef} className={`min-h-0 flex-1 px-5 ${step === 'category' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`}>
              {/* Type Toggle */}
              <div className="flex shrink-0 justify-center gap-2 py-3">
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
                <div>
                  <div className="py-2 text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                      <span className="text-2xl mr-1">¥</span>
                      {formattedAmount}
                    </div>
                  </div>

                  <div className="pb-2">
                    <input
                      type="text"
                      ref={noteInputRef}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onFocus={handleNoteFocus}
                      placeholder="添加备注..."
                      className="input-field text-center text-sm"
                    />
                  </div>

                  <div className="pb-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-primary-400 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="pt-1 pb-6">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleNumberInput(String(n))}
                          className="rounded-xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => handleNumberInput('.')}
                        className="rounded-xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                      >
                        .
                      </button>
                      <button
                        onClick={() => handleNumberInput('0')}
                        className="rounded-xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
                      >
                        0
                      </button>
                      <button
                        onClick={() => handleNumberInput('00')}
                        className="rounded-xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:scale-95 active:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-200"
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
                </div>
              ) : (
                /* Category step: flex layout, grid scrolls, buttons anchored */
                <>
                  <div className="py-2 text-center shrink-0">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      <span className="text-lg mr-1">¥</span>
                      {formattedAmount}
                    </div>
                    {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
                    <div className="grid grid-cols-4 gap-3 pb-4">
                      {currentCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryId(cat.id!)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl p-4 transition-all active:scale-95 ${
                            categoryId === cat.id
                              ? 'bg-primary-50 ring-2 ring-primary-400 dark:bg-primary-900/30'
                              : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="h-7 w-7 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm text-gray-600 dark:text-gray-300 text-center leading-tight">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3 py-3 pb-[60px] border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => setStep('amount')} className="btn-secondary flex-1">
                      返回修改
                    </button>
                    <button onClick={handleSave} disabled={!categoryId} className="btn-primary flex-1">
                      {editTx ? '保存修改' : '确认添加'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
