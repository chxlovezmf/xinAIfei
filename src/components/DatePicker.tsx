import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  min?: string;
  max?: string;
  className?: string;
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export default function DatePicker({ value, onChange, label, min, max, className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dayjs(value || undefined).startOf('month'));
  const [yearDraft, setYearDraft] = useState(() => String(dayjs(value || undefined).year()));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const today = dayjs().format('YYYY-MM-DD');
  const isAllowed = (date: string) => (!min || date >= min) && (!max || date <= max);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  const openPicker = () => {
    const date = dayjs(value || undefined);
    const initial = date.isValid() ? date : dayjs();
    setVisibleMonth(initial.startOf('month'));
    setYearDraft(String(initial.year()));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const changeMonth = (offset: number) => {
    const next = visibleMonth.add(offset, 'month');
    setVisibleMonth(next);
    setYearDraft(String(next.year()));
  };
  const applyYear = () => {
    const year = Number(yearDraft);
    if (!Number.isInteger(year) || year < 100 || year > 9999) {
      setYearDraft(String(visibleMonth.year()));
      return;
    }
    setVisibleMonth(visibleMonth.year(year));
    setYearDraft(String(year));
  };
  const choose = (date: string) => { if (isAllowed(date)) { onChange(date); close(); } };
  const first = visibleMonth.startOf('month').subtract(visibleMonth.day(), 'day');

  return <>
    <button type="button" ref={triggerRef} onClick={openPicker} aria-label={`${label}，${value ? dayjs(value).format('YYYY年M月D日') : '请选择日期'}`} aria-haspopup="dialog" aria-expanded={open}
      style={{ backgroundColor: 'var(--theme-surface-solid)', color: 'var(--theme-text)', borderColor: 'var(--theme-border-muted)' }}
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-sm transition-colors hover:border-primary-300 ${className}`}>
      <CalendarDays size={16} className="shrink-0 text-primary-500" />
      <span className="min-w-0 flex-1 whitespace-nowrap">{value ? dayjs(value).format('YYYY年M月D日') : '选择日期'}</span>
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={event => { event.stopPropagation(); close(); }}>
        <section role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()}
          className="modal-surface w-full max-w-sm overflow-y-auto rounded-3xl border p-4 shadow-xl" style={{ maxHeight: 'min(90dvh, 42rem)' }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-primary-600 dark:text-primary-300">{label}</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">{value ? dayjs(value).format('YYYY年M月D日') : '选择日期'}</h2>
            </div>
            <button type="button" ref={closeRef} onClick={close} aria-label="关闭日期选择" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={19} /></button>
          </div>
          <div className="mb-3 flex items-center gap-1 rounded-2xl px-1 py-1" style={{ backgroundColor: 'var(--theme-surface-muted)' }}>
            <button type="button" onClick={() => changeMonth(-1)} aria-label="上个月" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-white dark:hover:bg-gray-700"><ChevronLeft size={19} /></button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-100">
              <input aria-label="年份" type="number" min={100} max={9999} value={yearDraft} onChange={event => setYearDraft(event.target.value)} onBlur={applyYear}
                onKeyDown={event => { if (event.key === 'Enter') { applyYear(); event.currentTarget.blur(); } }} style={{ backgroundColor: 'var(--theme-surface-solid)', color: 'var(--theme-text)', borderColor: 'var(--theme-border-muted)' }} className="w-16 rounded-lg border px-1 py-1 text-center" />年
              <select aria-label="月份" value={visibleMonth.month()} onChange={event => setVisibleMonth(visibleMonth.month(Number(event.target.value)))} style={{ backgroundColor: 'var(--theme-surface-solid)', color: 'var(--theme-text)', borderColor: 'var(--theme-border-muted)' }} className="rounded-lg border px-1 py-1">
                {Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index + 1}月</option>)}
              </select>
            </div>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下个月" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-white dark:hover:bg-gray-700"><ChevronRight size={19} /></button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weekdays.map(day => <span key={day} className="py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{day}</span>)}
            {Array.from({ length: 42 }, (_, index) => {
              const date = first.add(index, 'day');
              const dateString = date.format('YYYY-MM-DD');
              const selected = dateString === value;
              return <button type="button" key={dateString} disabled={!isAllowed(dateString)} onClick={() => choose(dateString)} aria-label={date.format('YYYY年M月D日')} aria-pressed={selected}
                className={`mx-auto flex h-10 w-10 max-w-full flex-col items-center justify-center rounded-xl text-sm transition-colors disabled:opacity-25 ${selected ? 'bg-primary-500 font-semibold text-white shadow-sm' : date.month() === visibleMonth.month() ? 'text-gray-700 hover:bg-primary-50 dark:text-gray-100 dark:hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700'}`}>
                <span>{date.date()}</span>{dateString === today && <span className={`h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-primary-500'}`} />}
              </button>;
            })}
          </div>
          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
            <button type="button" disabled={!isAllowed(today)} onClick={() => choose(today)} className="rounded-xl bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 disabled:opacity-40 dark:bg-primary-900/40 dark:text-primary-200">今天</button>
          </div>
        </section>
      </div>, document.body)}
  </>;
}
