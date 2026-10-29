import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBudgetForMonth, getTransactionsByMonth, saveBudget } from '../db/database';
import { formatAmount } from '../utils/format';
import type { BudgetConfig, BudgetKey, Category, Transaction } from '../types';

const groups: { key: BudgetKey; label: string; icon: string }[] = [
  { key: 'clothing', label: '衣', icon: '👕' }, { key: 'food', label: '食', icon: '🍚' },
  { key: 'housing', label: '住', icon: '🏠' }, { key: 'transport', label: '行', icon: '🚌' },
];

function initialConfig(month: string, categories: Category[]): BudgetConfig {
  const assignments: BudgetConfig['assignments'] = {};
  for (const cat of categories) {
    if (!cat.id || cat.type !== 'expense') continue;
    if (cat.name === '餐饮') assignments[String(cat.id)] = 'food';
    if (cat.name === '住房') assignments[String(cat.id)] = 'housing';
    if (cat.name === '交通') assignments[String(cat.id)] = 'transport';
    if (cat.name === '衣物') assignments[String(cat.id)] = 'clothing';
  }
  return { month, limits: { clothing: null, food: null, housing: null, transport: null }, assignments };
}

export default function MonthlyBudget({ categories, revision }: { categories: Category[]; revision: number }) {
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BudgetConfig | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentMonth = dayjs().format('YYYY-MM');

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLoading(true);
    setError('');
    const date = dayjs(`${month}-01`);
    Promise.all([getBudgetForMonth(month), getTransactionsByMonth(date.year(), date.month() + 1)])
      .then(([saved, txs]) => { if (active) { setConfig(saved ?? null); setTransactions(txs); } })
      .catch(() => { if (active) setError('预算加载失败，请稍后重试'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expanded, month, revision]);

  const startEditing = () => {
    setDraft(config ? { month: currentMonth, limits: { ...config.limits }, assignments: { ...config.assignments } } : initialConfig(currentMonth, categories));
    setError('');
    setEditing(true);
  };
  const save = async () => {
    if (!draft || saving) return;
    if (Object.values(draft.limits).some(value => value !== null && (!Number.isFinite(value) || value <= 0 || Math.abs(Math.round(value * 100) - value * 100) > 1e-7))) {
      setError('额度请输入大于零的金额，最多保留两位小数；留空表示未设置。'); return;
    }
    setSaving(true);
    try { await saveBudget(draft); setConfig(draft); setEditing(false); setError(''); }
    catch { setError('保存失败，请稍后重试'); }
    finally { setSaving(false); }
  };

  return <section className="glass-card mb-4 p-4">
    <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex min-h-11 w-full items-center justify-between text-left">
      <span><span className="text-sm font-semibold text-gray-800 dark:text-gray-100">🌱 月度预算</span><span className="ml-2 text-xs text-gray-500">衣食住行</span></span>
      <span className="text-xs text-primary-600">{expanded ? '收起' : '查看与设置'}</span>
    </button>
    {expanded && <>
      <div className="mt-2 flex items-center justify-between text-sm">
        <button type="button" aria-label="查看上月预算" className="rounded-lg p-2" onClick={() => { setEditing(false); setMonth(dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM')); }}><ChevronLeft size={18}/></button>
        <span className="font-medium text-gray-700 dark:text-gray-200">{month} 月度预算</span>
        <button type="button" aria-label="查看下月预算" disabled={month >= currentMonth} className="rounded-lg p-2 disabled:opacity-30" onClick={() => { setEditing(false); setMonth(dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM')); }}><ChevronRight size={18}/></button>
      </div>
      {loading ? <p role="status" className="py-5 text-center text-xs text-gray-500">正在加载预算…</p> : <div className="mt-2 grid grid-cols-2 gap-2">
        {groups.map(group => {
          const spent = transactions.filter(tx => tx.type === 'expense' && config?.assignments[String(tx.categoryId)] === group.key).reduce((sum, tx) => sum + Math.round(tx.amount * 100), 0) / 100;
          const limit = config?.limits[group.key] ?? null;
          const remaining = limit === null ? null : Math.round((limit - spent) * 100) / 100;
          return <div key={group.key} className="control-surface min-w-0 rounded-2xl border p-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{group.icon} {group.label}</p>
            <p className="mt-1 text-xs text-gray-500">已花 ¥{formatAmount(spent)} / {limit === null ? '未设置' : `¥${formatAmount(limit)}`}</p>
            {limit !== null && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div className={`h-full rounded-full ${remaining! < 0 ? 'bg-red-400' : 'bg-primary-400'}`} style={{width: `${Math.min(100, spent / limit * 100)}%`}} /></div><p className={`mt-1 text-xs ${remaining! < 0 ? 'text-red-500' : 'text-primary-600'}`}>{remaining! < 0 ? `超出 ¥${formatAmount(-remaining!)}` : `剩余 ¥${formatAmount(remaining!)}`}</p></>}
          </div>;
        })}
      </div>}
      {month === currentMonth && !editing && !loading && !error && <button type="button" onClick={startEditing} className="btn-secondary mt-3 w-full py-2 text-sm">设置预算与分类</button>}
      {editing && draft && <div className="mt-4 space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        <p className="text-xs text-gray-500">修改从本月生效，之前月份保留原设置。金额留空为未设置。</p>
        <div className="grid grid-cols-2 gap-2">{groups.map(group => <label key={group.key} className="text-xs text-gray-600 dark:text-gray-300">{group.label}的月额度（元）<input type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.limits[group.key] ?? ''} onChange={e => setDraft({ ...draft, limits: { ...draft.limits, [group.key]: e.target.value === '' ? null : Number(e.target.value) } })} className="input-field mt-1 py-2" /></label>)}</div>
        <p className="text-xs text-gray-500">每个分类只能归入一个预算；购物默认不归入。</p>
        <div className="max-h-56 space-y-2 overflow-y-auto">{categories.filter(cat => cat.type === 'expense' && cat.id).map(cat => <label key={cat.id} className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-200"><span className="truncate">{cat.name}</span><select aria-label={`${cat.name}归属预算`} value={draft.assignments[String(cat.id)] || ''} onChange={e => { const assignments = { ...draft.assignments }; if (e.target.value) assignments[String(cat.id)] = e.target.value as BudgetKey; else delete assignments[String(cat.id)]; setDraft({ ...draft, assignments }); }} className="control-surface rounded-xl border px-3 py-2 text-sm"><option value="">不计入</option>{groups.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}</select></label>)}</div>
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => setEditing(false)} className="btn-secondary flex-1 py-2">取消</button><button type="button" disabled={saving} onClick={() => void save()} className="btn-primary flex-1 py-2">{saving ? '保存中…' : '保存'}</button></div>
      </div>}
      {error && !editing && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
      <details className="mt-3 text-xs leading-6 text-gray-500 dark:text-gray-400"><summary className="cursor-pointer text-primary-600">分类怎么记？</summary><p>按用途分类：买菜和外卖归“食”，衣物归“衣”，住房归“住”，交通归“行”；日用品可以单独分类。</p><p>混合订单可分开记：蔬菜 50 元记“买菜”，洗衣液 30 元记“日用品”。不清楚时也可按主要用途记一笔，预算仅作大致参考。</p></details>
    </>}
  </section>;
}
