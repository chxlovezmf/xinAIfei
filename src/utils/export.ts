import type { Transaction, Category, BudgetConfig, DailyPlan, DailyPlanCheck } from '../types';
import dayjs from 'dayjs';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const BACKUP_FILE_PREFIXES = ['鑫菲日记_数据备份_', '记一记_数据备份_'];

function downloadBlob(blob: Blob, fileName: string) {
  if ((navigator as any).share) {
    const file = new File([blob], fileName, { type: blob.type });
    (navigator as any).share({ files: [file], title: fileName }).catch(() => fallbackDownload(blob, fileName));
  } else {
    fallbackDownload(blob, fileName);
  }
}

function fallbackDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

export async function exportToExcel(transactions: Transaction[], categories: Category[], year: number, month: number) {
  const XLSX = await import('xlsx');
  const catMap = new Map(categories.map(c => [c.id!, c]));
  const data = transactions.map(tx => {
    const cat = catMap.get(tx.categoryId);
    return { '日期': tx.date, '类型': tx.type === 'expense' ? '支出' : '收入', '分类': cat?.name || '-', '金额': tx.type === 'expense' ? -tx.amount : tx.amount, '备注': tx.note || '', '创建时间': dayjs(tx.createdAt).format('YYYY-MM-DD HH:mm') };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '账目明细');
  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `鑫菲日记_账目_${year}年${month}月.xlsx`);
}

// --- Capacitor native file export ---

function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

/** Export data to a visible Documents folder (works on Android). Returns true if saved natively. */
export async function nativeExport(jsonStr: string, fileName: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: jsonStr,
      directory: Directory.Documents,
    });
    return true;
  } catch {
    return false;
  }
}

/** Try to open the system share sheet for the exported file. Returns true if shared. */
export async function shareExportFile(jsonStr: string, fileName: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: jsonStr,
      directory: Directory.Cache,
    });
    const result = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });
    await Share.share({ title: '鑫菲日记数据备份', url: result.uri });
    return true;
  } catch {
    return false;
  }
}

// --- Clipboard fallback ---

export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise(resolve => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => fallbackCopy(text, resolve));
      } else {
        fallbackCopy(text, resolve);
      }
    } catch { fallbackCopy(text, resolve); }
  });
}

function fallbackCopy(text: string, resolve: (v: boolean) => void) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    resolve(ok);
  } catch { resolve(false); }
}

export function getExportDataString(
  transactions: Transaction[],
  notes: any[],
  categories: Category[],
  balance?: any,
  budgets: BudgetConfig[] = [],
  dailyPlans: DailyPlan[] = [],
  dailyPlanChecks: DailyPlanCheck[] = [],
) {
  return JSON.stringify({
    version: '1.3',
    exportedAt: new Date().toISOString(),
    transactions,
    notes,
    categories,
    balance: balance || null,
    budgets,
    dailyPlans,
    dailyPlanChecks,
  }, null, 2);
}

export function exportAllData(
  transactions: Transaction[],
  notes: any[],
  categories: Category[],
  balance?: any,
  budgets: BudgetConfig[] = [],
  dailyPlans: DailyPlan[] = [],
  dailyPlanChecks: DailyPlanCheck[] = [],
) {
  downloadBlob(
    new Blob([getExportDataString(transactions, notes, categories, balance, budgets, dailyPlans, dailyPlanChecks)], { type: 'application/json' }),
    `鑫菲日记_数据备份_${dayjs().format('YYYYMMDD')}.json`,
  );
}

export interface ImportData {
  transactions: any[];
  notes: any[];
  categories: any[];
  balance?: any;
  budgets?: BudgetConfig[];
  dailyPlans?: DailyPlan[];
  dailyPlanChecks?: DailyPlanCheck[];
}

const BUDGET_KEYS = ['clothing', 'food', 'housing', 'transport'];

function isValidBudget(budget: any) {
  return !!budget
    && /^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month)
    && !!budget.limits
    && BUDGET_KEYS.every(key => budget.limits[key] === null || (typeof budget.limits[key] === 'number' && Number.isFinite(budget.limits[key]) && budget.limits[key] > 0))
    && !!budget.assignments
    && typeof budget.assignments === 'object'
    && !Array.isArray(budget.assignments)
    && Object.values(budget.assignments).every(value => BUDGET_KEYS.includes(value as string));
}

function isValidDailyPlan(plan: any) {
  return !!plan
    && Number.isInteger(plan.id) && plan.id > 0
    && typeof plan.text === 'string' && plan.text.trim().length > 0
    && Array.isArray(plan.days)
    && plan.days.every((day: any) => Number.isInteger(day) && day >= 0 && day <= 6)
    && new Set(plan.days).size === plan.days.length
    && typeof plan.order === 'number' && Number.isFinite(plan.order)
    && typeof plan.createdAt === 'string';
}

function isValidDailyPlanCheck(check: any) {
  return !!check
    && typeof check.id === 'string'
    && Number.isInteger(check.planId) && check.planId > 0
    && typeof check.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(check.date)
    && typeof check.done === 'boolean'
    && check.id === `${check.planId}_${check.date}`;
}

export function importAllData(jsonStr: string): ImportData | null {
  try {
    const data = JSON.parse(jsonStr);
    if (!['1.0', '1.1', '1.2', '1.3'].includes(data.version)) return null;

    // 1.0 / 1.1：仅账目、笔记、分类（字段可缺失）
    if (data.version === '1.0' || data.version === '1.1') {
      if ([data.transactions, data.notes, data.categories].some(value => value != null && !Array.isArray(value))) return null;
      return {
        transactions: data.transactions || [],
        notes: data.notes || [],
        categories: data.categories || [],
        balance: data.balance || null,
      };
    }

    // 1.2 起：三个核心数组和预算必填
    if (!Array.isArray(data.transactions) || !Array.isArray(data.notes) || !Array.isArray(data.categories)) return null;
    if (!Array.isArray(data.budgets) || !data.budgets.every(isValidBudget)) return null;
    if (new Set(data.budgets.map((budget: BudgetConfig) => budget.month)).size !== data.budgets.length) return null;

    // 1.3 起：每日计划和打卡记录必填
    if (data.version === '1.3') {
      if (!Array.isArray(data.dailyPlans) || !data.dailyPlans.every(isValidDailyPlan)) return null;
      if (!Array.isArray(data.dailyPlanChecks) || !data.dailyPlanChecks.every(isValidDailyPlanCheck)) return null;
      if (new Set(data.dailyPlans.map((plan: DailyPlan) => plan.id)).size !== data.dailyPlans.length) return null;
      if (new Set(data.dailyPlanChecks.map((check: DailyPlanCheck) => check.id)).size !== data.dailyPlanChecks.length) return null;
    }

    return {
      transactions: data.transactions,
      notes: data.notes,
      categories: data.categories,
      balance: data.balance || null,
      budgets: data.budgets,
      dailyPlans: data.version === '1.3' ? data.dailyPlans : undefined,
      dailyPlanChecks: data.version === '1.3' ? data.dailyPlanChecks : undefined,
    };
  } catch { return null; }
}

// --- Capacitor native file import ---

export interface BackupFileInfo { name: string; path: string; size: number; date: string; }

export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  if (!isNative()) return [];
  try {
    const result = await Filesystem.readdir({ path: '', directory: Directory.Documents });
    const files = result.files.filter(f => BACKUP_FILE_PREFIXES.some(prefix => f.name.startsWith(prefix)) && f.name.endsWith('.json') && f.type === 'file');
    return files.map(f => ({ name: f.name, path: f.name, size: f.size ?? 0, date: (f as any).mtime || '' }));
  } catch { return []; }
}

export async function readBackupFile(path: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Documents });
    return result.data as string;
  } catch { return null; }
}
