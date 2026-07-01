import * as XLSX from 'xlsx';
import type { Transaction, Category } from '../types';
import dayjs from 'dayjs';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

export function exportToExcel(transactions: Transaction[], categories: Category[], year: number, month: number) {
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
  downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `记一记_账目_${year}年${month}月.xlsx`);
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
    await Share.share({ title: '记一记数据备份', url: result.uri });
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

export function getExportDataString(transactions: Transaction[], notes: any[], categories: Category[]) {
  return JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), transactions, notes, categories }, null, 2);
}

export function exportAllData(transactions: Transaction[], notes: any[], categories: Category[]) {
  const data = { version: '1.0', exportedAt: new Date().toISOString(), transactions, notes, categories };
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `记一记_数据备份_${dayjs().format('YYYYMMDD')}.json`);
}

export function importAllData(jsonStr: string): { transactions: any[]; notes: any[]; categories: any[] } | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.version === '1.0') return { transactions: data.transactions || [], notes: data.notes || [], categories: data.categories || [] };
    return null;
  } catch { return null; }
}

// --- Capacitor native file import ---

export interface BackupFileInfo { name: string; path: string; size: number; date: string; }

export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  if (!isNative()) return [];
  try {
    const result = await Filesystem.readdir({ path: '', directory: Directory.Documents });
    const files = result.files.filter(f => f.name.startsWith('记一记_数据备份_') && f.name.endsWith('.json') && f.type === 'file');
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
