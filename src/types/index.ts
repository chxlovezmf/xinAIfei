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

export interface Task {
  id?: number;
  text: string;
  done: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type PageView = 'home' | 'accounting' | 'notes' | 'stats' | 'settings';
