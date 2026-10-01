import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth } from '../utils/format';

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <>
      <div className="glass-card relative flex items-center justify-between px-4 py-2.5">
        <motion.button aria-label="上个月" whileTap={{ scale: 0.85 }} onClick={prevMonth} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 active:scale-90 dark:hover:bg-gray-700">
          <ChevronLeft size={20} />
        </motion.button>
        <button aria-label="选择月份" onClick={() => setShowPicker(!showPicker)} className="min-h-11 px-3 text-sm font-semibold text-gray-800 transition-colors hover:text-primary-500 dark:text-gray-200">
          {formatMonth(year, month)}
        </button>
        <motion.button aria-label="下个月" whileTap={{ scale: 0.85 }} onClick={nextMonth} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 active:scale-90 dark:hover:bg-gray-700">
          <ChevronRight size={20} />
        </motion.button>
      </div>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="modal-surface w-full max-w-xs rounded-2xl border p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => onChange(year - 1, month)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronLeft size={18} />
                </motion.button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{year}年</span>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => onChange(year + 1, month)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronRight size={18} />
                </motion.button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => { onChange(year, m); setShowPicker(false); }}
                    className={`relative rounded-lg py-1.5 text-xs font-medium transition-all ${
                      m === month ? 'text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {m === month && (
                      <motion.div layoutId="month-picker-selected"
                        className="absolute inset-0 rounded-lg grad-card grad-primary grad-animated shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    )}
                    <span className="relative">{m}月</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
