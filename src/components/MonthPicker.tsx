import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
    <div className="relative flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-gray-800">
      <button onClick={prevMonth} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-90 transition-all dark:hover:bg-gray-700">
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => setShowPicker(!showPicker)} className="text-sm font-semibold text-gray-800 hover:text-primary-500 transition-colors dark:text-gray-200">
        {formatMonth(year, month)}
      </button>
      <button onClick={nextMonth} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-90 transition-all dark:hover:bg-gray-700">
        <ChevronRight size={20} />
      </button>
 
      {/* Year/Month quick picker popup */}
      {showPicker && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 mx-4">
          <div className="rounded-xl bg-white p-3 shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => onChange(year - 1, month)} className="text-xs text-gray-400 hover:text-primary-500 px-2 py-1">&lt;</button>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{year}年</span>
              <button onClick={() => onChange(year + 1, month)} className="text-xs text-gray-400 hover:text-primary-500 px-2 py-1">&gt;</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  onClick={() => { onChange(year, m); setShowPicker(false); }}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                    m === month
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {m}月
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
