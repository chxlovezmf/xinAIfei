import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Gamepad2, ListChecks, Pencil, Trash2, X } from 'lucide-react';
import dayjs from 'dayjs';
import type { DailyPlan } from '../types';
import {
  addDailyPlan, countDailyPlanChecksBefore, deleteDailyPlan, deleteDailyPlanChecksBefore, getDailyPlanChecksBetween, getDailyPlanChecksByDate, getDailyPlans,
  isDailyPlanActiveOn, setDailyPlanCheck, swapDailyPlanOrder, updateDailyPlan,
} from '../db/database';
import { ListSkeleton } from './Skeleton';
import EmptyState from './EmptyState';
import DatePicker from './DatePicker';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_GROUP = '日常清单';

function daysLabel(days: number[]) {
  if (days.length === 0) return '每天';
  return days.map(day => '周' + WEEKDAY_LABELS[day]).join('、');
}

function toggleDay(days: number[], day: number) {
  if (days.includes(day)) {
    // 至少保留一天，避免出现“哪天都不显示”的任务
    return days.length <= 1 ? days : days.filter(item => item !== day);
  }
  return [...days, day].sort((a, b) => a - b);
}

export default function DailyPlanPanel() {
  const today = dayjs().format('YYYY-MM-DD');
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs(today).subtract(weekOffset * 7 + 6 - i, 'day').format('YYYY-MM-DD')),
    [today, weekOffset],
  );
  const currentWeekStart = useRef(weekDates[0]);
  const loadSequence = useRef(0);
  useLayoutEffect(() => { currentWeekStart.current = weekDates[0]; }, [weekDates]);

  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newGroup, setNewGroup] = useState(DEFAULT_GROUP);
  const [newDays, setNewDays] = useState<number[]>(ALL_DAYS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editGroup, setEditGroup] = useState(DEFAULT_GROUP);
  const [editDays, setEditDays] = useState<number[]>(ALL_DAYS);
  const [sortMode, setSortMode] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [cleanupBefore, setCleanupBefore] = useState(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));
  const [cleanupMessage, setCleanupMessage] = useState('');

  const load = useCallback(async () => {
    if (currentWeekStart.current !== weekDates[0]) return;
    const sequence = ++loadSequence.current;
    const isCurrent = () => sequence === loadSequence.current && currentWeekStart.current === weekDates[0];
    try {
      const [storedPlans, checks, todayChecks] = await Promise.all([
        getDailyPlans(),
        getDailyPlanChecksBetween(weekDates[0], weekDates[6]),
        getDailyPlanChecksByDate(today),
      ]);
      if (!isCurrent()) return;
      setPlans(storedPlans);
      setDoneKeys(new Set([...checks, ...todayChecks].filter(check => check.done && check.id).map(check => check.id as string)));
      setError('');
    } catch {
      if (isCurrent()) setError('读取计划失败，请重新打开页面再试');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [today, weekDates]);

  useEffect(() => { void load(); return () => { loadSequence.current += 1; }; }, [load]);

  const todayPlans = useMemo(
    () => plans.filter(plan => isDailyPlanActiveOn(plan, today)),
    [plans, today],
  );
  const doneToday = todayPlans.filter(plan => plan.id != null && doneKeys.has(`${plan.id}_${today}`)).length;
  const totalToday = todayPlans.length;
  const progress = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);
  const matrixPlans = plans.filter(plan => weekDates.some(date => plan.id != null && doneKeys.has(`${plan.id}_${date}`)) ||
    (weekOffset === 0 && weekDates.some(date => isDailyPlanActiveOn(plan, date))));
  const visiblePlans = showAll ? plans : todayPlans;
  const groups = Array.from(new Set(visiblePlans.map(plan => plan.group?.trim() || DEFAULT_GROUP)));

  const togglePlan = (plan: DailyPlan) => {
    if (plan.id == null) return;
    const key = `${plan.id}_${today}`;
    const nextDone = !doneKeys.has(key);
    setDoneKeys(prev => {
      const next = new Set(prev);
      if (nextDone) next.add(key); else next.delete(key);
      return next;
    });
    void setDailyPlanCheck(plan.id, today, nextDone).catch(async () => { await load(); setError('打卡保存失败，请再试一次'); });
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    await addDailyPlan({ text, days: newDays, group: newGroup });
    setNewText('');
    setNewDays(ALL_DAYS);
    await load();
  };

  const startEdit = (plan: DailyPlan) => {
    setEditingId(plan.id ?? null);
    setEditText(plan.text);
    setEditGroup(plan.group?.trim() || DEFAULT_GROUP);
    setEditDays(plan.days.length ? plan.days : ALL_DAYS);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const text = editText.trim();
    if (!text) return;
    await updateDailyPlan(editingId, { text, days: editDays, group: editGroup.trim() || DEFAULT_GROUP });
    setEditingId(null);
    await load();
  };

  const handleDelete = async (plan: DailyPlan) => {
    if (plan.id == null) return;
    if (!window.confirm(`确定删除「${plan.text}」吗？\n它的历史打卡记录也会一起删除。`)) return;
    await deleteDailyPlan(plan.id);
    await load();
  };

  const handleMove = async (plan: DailyPlan, direction: -1 | 1) => {
    if (plan.id == null) return;
    const groupPlans = visiblePlans.filter(item => (item.group?.trim() || DEFAULT_GROUP) === (plan.group?.trim() || DEFAULT_GROUP));
    const index = groupPlans.findIndex(item => item.id === plan.id);
    const target = groupPlans[index + direction];
    if (!target || target.id == null) return;
    await swapDailyPlanOrder(plan.id, target.id);
    await load();
  };

  const handleCleanup = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanupBefore) || cleanupBefore > today) return;
    try {
      const count = await countDailyPlanChecksBefore(cleanupBefore);
      if (count === 0) { setCleanupMessage('该日期之前没有打卡记录'); return; }
      if (!window.confirm(`将删除 ${cleanupBefore} 之前的 ${count} 条打卡记录，不能撤销。建议先在设置中导出备份。\n\n确定删除吗？`)) return;
      const removed = await deleteDailyPlanChecksBefore(cleanupBefore);
      await load();
      setCleanupMessage(`已清理 ${removed} 条打卡记录`);
    } catch {
      setError('清理失败，请稍后重试');
    }
  };

  const renderDayChips = (days: number[], onChange: (days: number[]) => void) => (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-0.5 text-xs text-gray-400">重复</span>
      {ALL_DAYS.map(day => {
        const active = days.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onChange(toggleDay(days, day))}
            aria-pressed={active}
            aria-label={'每周' + WEEKDAY_LABELS[day]}
            className={'h-7 w-7 rounded-full text-xs font-medium transition-colors ' +
              (active
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600')}
          >
            {WEEKDAY_LABELS[day]}
          </button>
        );
      })}
      <span className="ml-1 text-[11px] text-gray-400">{days.length === 7 ? '每天' : '共 ' + days.length + ' 天'}</span>
    </div>
  );

  if (loading) return <ListSkeleton />;

  const encouragement = totalToday === 0
    ? '今天没有固定任务'
    : doneToday === totalToday
      ? '全部完成 ✨'
      : `还有 ${totalToday - doneToday} 项待完成`;

  return (
    <div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</p>}
      <div className="glass-card mb-3 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">今日完成</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="text-xl font-bold text-primary-500">{doneToday}</span>
            <span className="mx-0.5">/</span>{totalToday}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <motion.div
            className="h-full rounded-full grad-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">{encouragement}</p>
      </div>

      <div className="glass-card mb-4 space-y-3 p-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">添加任务</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
            placeholder="添加固定任务，如：喝水、运动、读书"
            className="input-field flex-1 text-sm"
            aria-label="固定任务内容"
          />
          <button onClick={() => void handleAdd()} className="btn-primary px-4 text-sm">添加</button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="new-plan-group" className="shrink-0 text-xs text-gray-500 dark:text-gray-300">所属清单</label>
          <input id="new-plan-group" list="plan-groups" value={newGroup} onChange={event => setNewGroup(event.target.value)} maxLength={24}
            placeholder="例如：学习清单" className="input-field min-w-0 flex-1 py-2 text-sm" />
          <datalist id="plan-groups">
            {Array.from(new Set([DEFAULT_GROUP, '学习清单', '游戏清单', ...plans.map(plan => plan.group || DEFAULT_GROUP)])).map(group => <option key={group} value={group} />)}
          </datalist>
        </div>
        {renderDayChips(newDays, setNewDays)}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{showAll ? '全部任务' : '今日清单'}</p>
          <p className="text-xs text-gray-400">{dayjs().format('M月D日')} · 周{WEEKDAY_LABELS[dayjs().day()]}</p>
        </div>
        <div className="flex items-center gap-2">
        {plans.length > 0 && <button type="button" onClick={() => setShowAll(value => !value)} className="text-xs font-medium text-primary-600 dark:text-primary-300">{showAll ? '只看今天' : '全部任务'}</button>}
        {visiblePlans.length > 1 && (
          <button
            type="button"
            onClick={() => setSortMode(value => !value)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {sortMode ? '完成排序' : '排序'}
          </button>
        )}
        </div>
      </div>

      {visiblePlans.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title={plans.length === 0 ? '还没有固定任务' : '今天没有固定任务'}
          description={plans.length === 0 ? '添加每天要做的固定任务' : '今天不用打卡'}
        />
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const groupPlans = visiblePlans.filter(plan => (plan.group?.trim() || DEFAULT_GROUP) === group);
            const scheduled = groupPlans.filter(plan => isDailyPlanActiveOn(plan, today));
            const completed = scheduled.filter(plan => plan.id != null && doneKeys.has(`${plan.id}_${today}`)).length;
            const GroupIcon = group.includes('学习') ? BookOpen : group.includes('游戏') ? Gamepad2 : ListChecks;
            return <section key={group} className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300"><GroupIcon size={20} /></span>
                <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold text-gray-800 dark:text-gray-100">{group}</h3><p className="text-xs text-gray-500 dark:text-gray-400">今日 {completed} / {scheduled.length} 完成</p></div>
                {scheduled.length > 0 && completed === scheduled.length && <CheckCircle2 size={19} className="shrink-0 text-primary-500" aria-label="今日全部完成" />}
              </div>
          {groupPlans.map((plan, index) => {
            const isEditing = editingId === plan.id;
            const isDone = plan.id != null && doneKeys.has(`${plan.id}_${today}`);
            const activeToday = isDailyPlanActiveOn(plan, today);
            return (
              <motion.div
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                className="flex items-start gap-2 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-700"
              >
                <motion.button
                  whileTap={{ scale: 0.75 }}
                  onClick={() => togglePlan(plan)}
                  disabled={!activeToday}
                  aria-label={isDone ? `将「${plan.text}」标记为未完成` : `将「${plan.text}」标记为完成`}
                  aria-pressed={isDone}
                  className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-primary-500 disabled:opacity-40"
                >
                  {isDone ? (
                    <motion.div key="done" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
                      <CheckCircle2 size={20} className="text-primary-500" />
                    </motion.div>
                  ) : <Circle size={20} />}
                </motion.button>

                {isEditing ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-primary-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      autoFocus
                      aria-label="编辑固定任务"
                    />
                    <label className="block text-xs text-gray-500 dark:text-gray-300">所属清单
                      <input list="plan-groups" value={editGroup} onChange={event => setEditGroup(event.target.value)} maxLength={24} className="input-field mt-1 w-full py-1.5 text-sm" />
                    </label>
                    {renderDayChips(editDays, setEditDays)}
                    <div className="flex justify-end gap-1">
                      <button onClick={() => void saveEdit()} aria-label="保存固定任务" className="rounded-full bg-primary-500 p-1.5 text-white hover:bg-primary-600">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} aria-label="取消编辑" className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className={'break-words text-sm ' + (isDone ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>{plan.text}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{daysLabel(plan.days)}{!activeToday ? ' · 今天未安排' : ''}</p>
                  </div>
                )}

                {!isEditing && (
                  sortMode ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button onClick={() => void handleMove(plan, -1)} disabled={index === 0} aria-label="上移固定任务"
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 disabled:opacity-30 dark:hover:bg-gray-700">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => void handleMove(plan, 1)} disabled={index === groupPlans.length - 1} aria-label="下移固定任务"
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 disabled:opacity-30 dark:hover:bg-gray-700">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button onClick={() => startEdit(plan)} aria-label="编辑固定任务" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 dark:hover:bg-gray-700">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => void handleDelete(plan)} aria-label="删除固定任务" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                )}
              </motion.div>
            );
          })}
            </section>;
          })}
        </div>
      )}

      {plans.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">打卡记录</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300">
              <button type="button" onClick={() => setWeekOffset(value => value + 1)} aria-label="前七天" className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={18} /></button>
              <span>{dayjs(weekDates[0]).format('YYYY/M/D')}–{dayjs(weekDates[6]).format('YYYY/M/D')}</span>
              <button type="button" onClick={() => setWeekOffset(value => Math.max(0, value - 1))} disabled={weekOffset === 0} aria-label="后七天" className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><span>跳转日期</span>
            <DatePicker label="跳转打卡日期" max={today} value={weekDates[6]} onChange={date => setWeekOffset(Math.floor(dayjs(today).diff(dayjs(date), 'day') / 7))} />
          </div>
          <div className="glass-card overflow-x-auto px-3 py-3">
            {matrixPlans.length === 0 ? <p className="py-3 text-center text-xs text-gray-500">这七天没有打卡记录</p> : (
            <div className="grid min-w-[17.5rem] items-center gap-x-1 gap-y-3" style={{ gridTemplateColumns: 'minmax(3.5rem, 1.25fr) repeat(7, minmax(1.65rem, 1fr))' }}>
              <span />
              {weekDates.map(date => {
                const isToday = date === today;
                return (
                  <span key={date} className={'whitespace-nowrap text-center text-[10px] ' + (isToday ? 'font-bold text-primary-500' : 'text-gray-500')}>
                    {dayjs(date).format('M/D')}
                  </span>
                );
              })}
              {matrixPlans.map(plan => {
                return (
                  <Fragment key={plan.id}>
                    <span className="truncate pr-1 text-[11px] text-gray-600 dark:text-gray-300">{plan.text}</span>
                    {weekDates.map(date => {
                      const done = plan.id != null && doneKeys.has(`${plan.id}_${date}`);
                      return (
                        <span key={date} className="flex items-center justify-center" role="img"
                          aria-label={`${plan.text} ${dayjs(date).format('M月D日')}：${done ? '已打卡' : '没有打卡记录'}`}>
                          {done ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-white">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          )}
                        </span>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
            )}
          </div>
          <details className="mt-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
            <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300">管理历史记录</summary>
            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">清理前建议先导出备份。</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-300">清理早于</span>
              <DatePicker label="清理早于日期" max={today} value={cleanupBefore} onChange={date => { setCleanupBefore(date); setCleanupMessage(''); }} className="flex-1" />
              <button type="button" onClick={() => void handleCleanup()} disabled={!cleanupBefore || cleanupBefore > today} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-300">清理</button>
            </div>
            {cleanupMessage && <p role="status" className="mt-2 text-xs text-gray-600 dark:text-gray-300">{cleanupMessage}</p>}
          </details>
        </div>
      )}
    </div>
  );
}
