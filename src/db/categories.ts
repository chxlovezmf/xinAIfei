import type { Category } from '../types';

export const presetCategories: Omit<Category, 'id'>[] = [
  // 支出
  { name: '餐饮', type: 'expense', icon: 'utensils-crossed', color: '#ef4444', order: 0, preset: true },
  { name: '交通', type: 'expense', icon: 'car', color: '#f97316', order: 1, preset: true },
  { name: '购物', type: 'expense', icon: 'shopping-bag', color: '#eab308', order: 2, preset: true },
  { name: '娱乐', type: 'expense', icon: 'gamepad-2', color: '#22c55e', order: 3, preset: true },
  { name: '住房', type: 'expense', icon: 'home', color: '#06b6d4', order: 4, preset: true },
  { name: '通讯', type: 'expense', icon: 'smartphone', color: '#3b82f6', order: 5, preset: true },
  { name: '医疗', type: 'expense', icon: 'heart-pulse', color: '#ec4899', order: 6, preset: true },
  { name: '教育', type: 'expense', icon: 'book-open', color: '#8b5cf6', order: 7, preset: true },
  { name: '其他支出', type: 'expense', icon: 'more-horizontal', color: '#6b7280', order: 8, preset: true },
  // 收入
  { name: '工资', type: 'income', icon: 'wallet', color: '#14b8a6', order: 0, preset: true },
  { name: '兼职', type: 'income', icon: 'briefcase', color: '#10b981', order: 1, preset: true },
  { name: '投资', type: 'income', icon: 'trending-up', color: '#f59e0b', order: 2, preset: true },
  { name: '红包', type: 'income', icon: 'gift', color: '#ef4444', order: 3, preset: true },
  { name: '其他收入', type: 'income', icon: 'more-horizontal', color: '#6b7280', order: 4, preset: true },
];

// Only keep English icon names; map to Lucide
export const iconMap: Record<string, string> = {
  'utensils-crossed': 'UtensilsCrossed',
  'car': 'Car',
  'shopping-bag': 'ShoppingBag',
  'gamepad-2': 'Gamepad2',
  'home': 'Home',
  'smartphone': 'Smartphone',
  'heart-pulse': 'HeartPulse',
  'book-open': 'BookOpen',
  'more-horizontal': 'MoreHorizontal',
  'wallet': 'Wallet',
  'briefcase': 'Briefcase',
  'trending-up': 'TrendingUp',
  'gift': 'Gift',
};
