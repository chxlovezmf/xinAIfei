export interface Transaction {
  id?: number;
  type: 'income' | 'expense';
  amount: number;
  categoryId: number;
  date: string; // YYYY-MM-DD
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  type: 'short' | 'long';
  tags: string[];
  pinned: boolean;
  transactionId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  order: number;
  preset: boolean;
}

export type BudgetKey = 'clothing' | 'food' | 'housing' | 'transport';
export interface BudgetConfig {
  month: string;
  limits: Record<BudgetKey, number | null>;
  assignments: Record<string, BudgetKey>;
}

export interface Task {
  id?: number;
  text: string;
  done: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

/** 每日计划的固定任务模板，days 为空数组表示每天；0=周日 … 6=周六 */
export interface DailyPlan {
  id?: number;
  text: string;
  days: number[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 每日计划的打卡记录，只保存已完成的日期，id 为 `${planId}_${date}` */
export interface DailyPlanCheck {
  id?: string;
  planId: number;
  date: string; // YYYY-MM-DD
  done: boolean;
  updatedAt: string;
}

export interface BalanceSnapshot {
  id?: number;
  amount: number;
  effectiveAt: string;
}

export type PageView = 'home' | 'accounting' | 'notes' | 'stats' | 'settings';
