import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth } from '../utils/format';

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-gray-800">
      <button onClick={prevMonth} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-90 transition-all dark:hover:bg-gray-700">
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {formatMonth(year, month)}
      </span>
      <button onClick={nextMonth} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-90 transition-all dark:hover:bg-gray-700">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
