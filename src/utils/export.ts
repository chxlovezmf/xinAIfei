import * as XLSX from 'xlsx';
import type { Transaction, Category } from '../types';
import dayjs from 'dayjs';

export function exportToExcel(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month: number
) {
  const catMap = new Map(categories.map((c) => [c.id!, c]));

  const data = transactions.map((tx) => {
    const cat = catMap.get(tx.categoryId);
    return {
      '日期': tx.date,
      '类型': tx.type === 'expense' ? '支出' : '收入',
      '分类': cat?.name || '-',
      '金额': tx.type === 'expense' ? -tx.amount : tx.amount,
      '备注': tx.note || '',
      '创建时间': dayjs(tx.createdAt).format('YYYY-MM-DD HH:mm'),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '账目明细');

  // Auto-fit column widths
  const colWidths = [
    { wch: 12 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 20 }, { wch: 16 },
  ];
  ws['!cols'] = colWidths;

  const fileName = `记一记_账目_${year}年${month}月.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportAllData(transactions: Transaction[], notes: any[], categories: Category[]) {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions,
    notes,
    categories,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `记一记_数据备份_${dayjs().format('YYYYMMDD')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonStr: string): {
  transactions: any[];
  notes: any[];
  categories: any[];
} | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.version === '1.0') {
      return {
        transactions: data.transactions || [],
        notes: data.notes || [],
        categories: data.categories || [],
      };
    }
    return null;
  } catch {
    return null;
  }
}
