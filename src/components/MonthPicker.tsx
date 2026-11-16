import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatMonth } from '../utils/format';

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(year);
  const [yearDraft, setYearDraft] = useState(String(year));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  const changeYear = (next: number) => { setDisplayYear(next); setYearDraft(String(next)); };
  const applyYear = () => {
    const next = Number(yearDraft);
    if (Number.isInteger(next) && next >= 100 && next <= 9999) changeYear(next);
    else setYearDraft(String(displayYear));
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

  return <>
    <div className="glass-card flex items-center justify-between px-3 py-2">
      <button type="button" aria-label="上个月" onClick={() => month === 1 ? onChange(year - 1, 12) : onChange(year, month - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={20} /></button>
      <button type="button" ref={triggerRef} aria-label={`选择月份，${formatMonth(year, month)}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { changeYear(year); setOpen(true); }} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-gray-800 hover:bg-primary-50 dark:text-gray-100 dark:hover:bg-gray-700"><CalendarDays size={17} className="text-primary-500" />{formatMonth(year, month)}</button>
      <button type="button" aria-label="下个月" onClick={() => month === 12 ? onChange(year + 1, 1) : onChange(year, month + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={20} /></button>
    </div>
    {open && createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={event => { event.stopPropagation(); close(); }}>
        <section role="dialog" aria-modal="true" aria-label="选择月份" onClick={event => event.stopPropagation()} className="modal-surface w-full max-w-sm rounded-3xl border p-4 shadow-xl" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
          <div className="mb-4 flex items-start justify-between">
            <div><p className="text-xs font-medium text-primary-600 dark:text-primary-300">选择月份</p><h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">{formatMonth(year, month)}</h2></div>
            <button type="button" ref={closeRef} onClick={close} aria-label="关闭月份选择" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={19} /></button>
          </div>
          <div className="mb-3 flex items-center justify-between rounded-2xl px-1 py-1" style={{ backgroundColor: 'var(--theme-surface-muted)' }}>
            <button type="button" onClick={() => changeYear(displayYear - 1)} aria-label="上一年" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-white dark:hover:bg-gray-700"><ChevronLeft size={19} /></button>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-100"><input type="number" aria-label="年份" min={100} max={9999} value={yearDraft} onChange={event => setYearDraft(event.target.value)} onBlur={applyYear} onKeyDown={event => { if (event.key === 'Enter') { applyYear(); event.currentTarget.blur(); } }} style={{ backgroundColor: 'var(--theme-surface-solid)', color: 'var(--theme-text)', borderColor: 'var(--theme-border-muted)' }} className="w-20 rounded-lg border px-1 py-1 text-center" /> 年</label>
            <button type="button" onClick={() => changeYear(displayYear + 1)} aria-label="下一年" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-white dark:hover:bg-gray-700"><ChevronRight size={19} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => index + 1).map(item => {
              const selected = item === month && displayYear === year;
              return <button type="button" key={item} aria-pressed={selected} onClick={() => { onChange(displayYear, item); close(); }} style={selected ? undefined : { backgroundColor: 'var(--theme-surface-muted)', color: 'var(--theme-text)' }} className={`min-h-12 rounded-xl text-sm font-medium transition-colors ${selected ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-primary-50 dark:hover:bg-gray-700'}`}>{item}月</button>;
            })}
          </div>
        </section>
      </div>, document.body)}
  </>;
}
