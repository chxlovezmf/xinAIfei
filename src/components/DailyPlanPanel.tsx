import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, CheckCircle2, Circle, ListChecks, Pencil, Trash2, X } from 'lucide-react';
import dayjs from 'dayjs';
import type { DailyPlan } from '../types';
import {
  addDailyPlan, deleteDailyPlan, getDailyPlanChecksBetween, getDailyPlans,
  isDailyPlanActiveOn, setDailyPlanCheck, swapDailyPlanOrder, updateDailyPlan,
} from '../db/database';
import { ListSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

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
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')),
    [],
  );

  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newDays, setNewDays] = useState<number[]>(ALL_DAYS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editDays, setEditDays] = useState<number[]>(ALL_DAYS);
  const [sortMode, setSortMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const [storedPlans, checks] = await Promise.all([
        getDailyPlans(),
        getDailyPlanChecksBetween(weekDates[0], today),
      ]);
      setPlans(storedPlans);
      setDoneKeys(new Set(checks.filter(check => check.done && check.id).map(check => check.id as string)));
    } finally {
      setLoading(false);
    }
  }, [today, weekDates]);

  useEffect(() => { void load(); }, [load]);

  const todayPlans = useMemo(
    () => plans.filter(plan => isDailyPlanActiveOn(plan, today)),
    [plans, today],
  );
  const doneToday = todayPlans.filter(plan => plan.id != null && doneKeys.has(`${plan.id}_${today}`)).length;
  const totalToday = todayPlans.length;
  const progress = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);
  const matrixPlans = plans.filter(plan => weekDates.some(date => isDailyPlanActiveOn(plan, date)));

  const togglePlan = (plan: DailyPlan) => {
    if (plan.id == null) return;
    const key = `${plan.id}_${today}`;
    const nextDone = !doneKeys.has(key);
    setDoneKeys(prev => {
      const next = new Set(prev);
      if (nextDone) next.add(key); else next.delete(key);
      return next;
    });
    void setDailyPlanCheck(plan.id, today, nextDone).catch(() => { void load(); });
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    await addDailyPlan({ text, days: newDays });
    setNewText('');
    setNewDays(ALL_DAYS);
    await load();
  };

  const startEdit = (plan: DailyPlan) => {
    setEditingId(plan.id ?? null);
    setEditText(plan.text);
    setEditDays(plan.days.length ? plan.days : ALL_DAYS);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const text = editText.trim();
    if (!text) return;
    await updateDailyPlan(editingId, { text, days: editDays });
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
    const index = todayPlans.findIndex(item => item.id === plan.id);
    const target = todayPlans[index + direction];
    if (!target || target.id == null) return;
    await swapDailyPlanOrder(plan.id, target.id);
    await load();
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

      <div className="mb-4 space-y-2">
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
        {renderDayChips(newDays, setNewDays)}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">今日清单</p>
          <p className="text-xs text-gray-400">{dayjs().format('M月D日')} · 周{WEEKDAY_LABELS[dayjs().day()]}</p>
        </div>
        {plans.length > 1 && (
          <button
            type="button"
            onClick={() => setSortMode(value => !value)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {sortMode ? '完成排序' : '排序'}
          </button>
        )}
      </div>

      {todayPlans.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title={plans.length === 0 ? '还没有固定任务' : '今天没有固定任务'}
          description={plans.length === 0 ? '添加每天要做的固定任务' : '今天不用打卡'}
        />
      ) : (
        <div className="space-y-1.5">
          {todayPlans.map((plan, index) => {
            const isEditing = editingId === plan.id;
            const isDone = plan.id != null && doneKeys.has(`${plan.id}_${today}`);
            return (
              <motion.div
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                className="glass-card flex items-center gap-2 px-3 py-2.5"
              >
                <motion.button
                  whileTap={{ scale: 0.75 }}
                  onClick={() => togglePlan(plan)}
                  aria-label={isDone ? `将「${plan.text}」标记为未完成` : `将「${plan.text}」标记为完成`}
                  aria-pressed={isDone}
                  className="shrink-0 text-gray-400 transition-colors hover:text-primary-500"
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
                    <p className={'text-sm ' + (isDone ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>{plan.text}</p>
                    <p className="text-[11px] text-gray-400">{daysLabel(plan.days)}</p>
                  </div>
                )}

                {!isEditing && (
                  sortMode ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button onClick={() => void handleMove(plan, -1)} disabled={index === 0} aria-label="上移固定任务"
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-500 disabled:opacity-30 dark:hover:bg-gray-700">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => void handleMove(plan, 1)} disabled={index === todayPlans.length - 1} aria-label="下移固定任务"
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
        </div>
      )}

      {matrixPlans.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">最近 7 天</h3>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" />完成</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-gray-300 dark:border-gray-600" />未完成</span>
            </div>
          </div>
          <div className="glass-card overflow-x-auto px-3 py-3">
            <div className="grid items-center gap-x-1 gap-y-2" style={{ gridTemplateColumns: 'minmax(4.5rem, 1fr) repeat(7, 1.5rem)' }}>
              <span />
              {weekDates.map(date => {
                const isToday = date === today;
                return (
                  <span key={date} className={'text-center text-[10px] ' + (isToday ? 'font-bold text-primary-500' : 'text-gray-400')}>
                    {WEEKDAY_LABELS[dayjs(date).day()]}
                  </span>
                );
              })}
              {matrixPlans.map(plan => {
                // 计划创建之前的日期不显示为“未完成”，避免新建任务出现一片空格子
                const createdDate = typeof plan.createdAt === 'string' ? plan.createdAt.slice(0, 10) : '';
                return (
                  <Fragment key={plan.id}>
                    <span className="truncate pr-1 text-[11px] text-gray-600 dark:text-gray-300">{plan.text}</span>
                    {weekDates.map(date => {
                      const notCreatedYet = createdDate !== '' && date < createdDate;
                      const active = !notCreatedYet && isDailyPlanActiveOn(plan, date);
                      const done = active && plan.id != null && doneKeys.has(`${plan.id}_${date}`);
                      return (
                        <span key={date} className="flex justify-center" role="img"
                          aria-label={`${plan.text} ${dayjs(date).format('M月D日')}：${notCreatedYet ? '计划尚未创建' : active ? (done ? '已完成' : '未完成') : '今天没有安排'}`}>
                          {!active ? (
                            <span className="h-4 w-4" />
                          ) : done ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-white">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600" />
                          )}
                        </span>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
