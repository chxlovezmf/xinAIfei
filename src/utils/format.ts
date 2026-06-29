import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string): string {
  const d = dayjs(dateStr);
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');

  if (d.isSame(today, 'day')) return '今天';
  if (d.isSame(yesterday, 'day')) return '昨天';
  return d.format('M月D日');
}

export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function getTodayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function getCurrentMonth() {
  const now = dayjs();
  return { year: now.year(), month: now.month() + 1 };
}

export function formatDateTime(isoStr: string): string {
  return dayjs(isoStr).format('M/D HH:mm');
}
