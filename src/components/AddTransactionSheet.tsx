import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, RotateCcw } from 'lucide-react';
import type { Category } from '../types';
import CategoryIcon from './CategoryIcon';
import { getCategories, addTransaction, updateTransaction } from '../db/database';
import { getTodayStr } from '../utils/format';
import { getBubuCategoryArt } from '../utils/categoryArt';

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
  const [expression, setExpression] = useState('');
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
        setExpression(String(editTx.amount));
        setCategoryId(editTx.categoryId);
        setDate(editTx.date);
        setNote(editTx.note);
        setStep('category');
      } else {
        setType('expense');
        setAmount('');
        setExpression('');
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

  const evaluateExpression = (value: string): number | null => {
    const normalized = value.replace(/×/g, '*').replace(/÷/g, '/');
    if (!normalized || !/^[0-9+\-*/.]+$/.test(normalized) || /[+\-*/.]$/.test(normalized)) return null;
    const tokens = normalized.match(/\d+(?:\.\d+)?|[+\-*/]/g);
    if (!tokens || tokens.join('') !== normalized || tokens[0].match(/[+*/]/)) return null;
    const values: number[] = [];
    const operators: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const apply = () => {
      const operator = operators.pop();
      const right = values.pop();
      const left = values.pop();
      if (!operator || left === undefined || right === undefined || (operator === '/' && right === 0)) return false;
      values.push(operator === '+' ? left + right : operator === '-' ? left - right : operator === '*' ? left * right : left / right);
      return true;
    };
    for (const token of tokens) {
      if (/^\d/.test(token)) values.push(Number(token));
      else {
        while (operators.length && precedence[operators[operators.length - 1]] >= precedence[token] && !apply()) return null;
        operators.push(token);
      }
    }
    while (operators.length && !apply()) return null;
    const result = values.length === 1 ? values[0] : null;
    return result !== null && Number.isFinite(result) ? Math.round(result * 100) / 100 : null;
  };

  const handleCalculatorKey = (key: string) => {
    if (key === 'clear') {
      setExpression('');
      setAmount('');
      return;
    }
    if (key === 'backspace') {
      const next = expression.slice(0, -1);
      setExpression(next);
      setAmount(evaluateExpression(next)?.toString() || '');
      return;
    }
    if (key === '=') {
      const result = evaluateExpression(expression);
      if (result !== null) {
        setAmount(String(result));
        setExpression(String(result));
      }
      return;
    }
    if (/^[+\-×÷]$/.test(key)) {
      if (!expression || /[+\-×÷]$/.test(expression)) {
        if (expression) setExpression(expression.slice(0, -1) + key);
        return;
      }
      setExpression(expression + key);
      setAmount('');
      return;
    }
    const currentPart = expression.split(/[+\-×÷]/).pop() || '';
    if (key === '.' && currentPart.includes('.')) return;
    if (key === '00' && (!expression || currentPart === '0')) return;
    const next = /^\d+$/.test(key) && currentPart === '0' && key !== '0'
      ? expression.slice(0, -1) + key
      : expression + key;
    setExpression(next);
    setAmount(evaluateExpression(next)?.toString() || '');
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

  const displayAmount = expression || amount || '0';
  const formattedAmount = amount || (evaluateExpression(expression)?.toString() || '0');

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
            className="sheet-surface safe-area-bottom fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl border-t"
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
              <div className="relative flex shrink-0 justify-center gap-2 py-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setType('expense'); setCategoryId(null); }}
                  className={`relative rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                    type === 'expense'
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {type === 'expense' && (
                    <motion.div layoutId="sheet-type-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-md" />
                  )}
                  <span className="relative">支出</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setType('income'); setCategoryId(null); }}
                  className={`relative rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                    type === 'income'
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {type === 'income' && (
                    <motion.div layoutId="sheet-type-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 shadow-md" />
                  )}
                  <span className="relative">收入</span>
                </motion.button>
              </div>

              {step === 'amount' ? (
                <div>
                  <div className="py-2 text-center">
                    <motion.div key={formattedAmount} initial={{ scale: 0.92, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                      <span className="text-2xl mr-1">¥</span>
                      {displayAmount}
                    </motion.div>
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
                      className="input-field text-sm [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="pt-1 pb-6">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <motion.button
                          key={n}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleCalculatorKey(String(n))}
                          className="calculator-key"
                        >
                          {n}
                        </motion.button>
                      ))}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleCalculatorKey('.')}
                        className="calculator-key"
                      >
                        .
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleCalculatorKey('0')}
                        className="calculator-key"
                      >
                        0
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleCalculatorKey('00')}
                         className="calculator-key"
                      >
                        00
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleCalculatorKey('backspace')}
                        className="calculator-key py-3 text-xl"
                      >
                        <Delete size={22} className="mx-auto" />
                      </motion.button>
                      {['+', '−', '×', '÷'].map((operator) => (
                        <motion.button key={operator} whileTap={{ scale: 0.85 }}
                          onClick={() => handleCalculatorKey(operator === '−' ? '-' : operator)}
                          className="calculator-key calculator-key-operator"
                        >{operator}</motion.button>
                      ))}
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCalculatorKey('clear')}
                        className="calculator-key calculator-key-muted"
                      ><RotateCcw size={18} className="mx-auto" /></motion.button>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCalculatorKey('=')}
                        className="calculator-key calculator-key-equals col-span-2"
                      >=</motion.button>
                    </div>
                    <button
                      onClick={() => amount && parseFloat(amount) > 0 && !/[+\-×÷]$/.test(expression) ? setStep('category') : null}
                      disabled={!amount || parseFloat(amount) <= 0 || /[+\-×÷]$/.test(expression)}
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

                  <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide p-0.5">
                    <div className="grid grid-cols-4 gap-1.5 pb-4">
                      {currentCategories.map((cat) => {
                        const isBubuTheme = document.documentElement.dataset.theme === 'bubu';
                        const artPath = isBubuTheme
                          ? getBubuCategoryArt(cat.type, cat.icon)
                          : undefined;
                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCategoryId(cat.id!)}
                            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
                              categoryId === cat.id
                                ? 'category-option-selected'
                                : 'category-option'
                            }`}
                          >
                            <div className="relative">
                              <motion.div animate={categoryId === cat.id ? { scale: 1.15 } : { scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                className="flex h-10 w-10 items-center justify-center">
                                {artPath
                                  ? <img src={artPath} alt="" className="h-full w-full object-contain" />
                                  : <CategoryIcon iconName={cat.icon || 'circle'} color={cat.color} size={22} className="h-10 w-10 rounded-2xl" />}
                              </motion.div>
                              {categoryId === cat.id && (
                                <motion.div layoutId="sheet-cat-ring" transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                  className={`absolute ${artPath ? '-inset-1 rounded-full' : '-inset-1 rounded-2xl'} border-2 border-primary-400`} />
                              )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300 text-center leading-tight">{cat.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3 py-3 pb-[60px] border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => setStep('amount')} className="btn-secondary bubu-art-button-soft flex-1">
                      返回修改
                    </button>
                    <button onClick={handleSave} disabled={!categoryId} className="btn-primary bubu-art-button flex-1">
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
