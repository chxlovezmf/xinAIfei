import Dexie, { type Table } from 'dexie';
import type { Transaction, Note, Category, Task, BalanceSnapshot } from '../types';
import { presetCategories } from './categories';

export class AppDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  notes!: Table<Note, number>;
  categories!: Table<Category, number>;
  tasks!: Table<Task, number>;
  balanceSnapshots!: Table<BalanceSnapshot, number>;

  constructor() {
    super('jiyiji');
    this.version(1).stores({
      transactions: '++id, type, categoryId, date, createdAt',
      notes: '++id, type, pinned, createdAt, updatedAt',
      categories: '++id, type, order',
    });
    this.version(2).stores({
      transactions: '++id, type, categoryId, date, createdAt',
      notes: '++id, type, pinned, createdAt, updatedAt',
      categories: '++id, type, order',
      tasks: '++id, date, done, createdAt',
    });
    this.version(3).stores({
      transactions: '++id, type, categoryId, date, createdAt',
      notes: '++id, type, pinned, createdAt, updatedAt',
      categories: '++id, type, order',
      tasks: '++id, date, done, createdAt',
      balanceSnapshots: 'id, effectiveAt',
    });
  }
}

export const db = new AppDatabase();

// Initialize preset categories if not already present
export async function importData(data: { transactions: any[]; notes: any[]; categories: any[]; balance?: BalanceSnapshot | null }) {
  await db.transactions.clear();
  await db.notes.clear();
  await db.categories.clear();
  await db.balanceSnapshots.clear();
  if (data.transactions.length) await db.transactions.bulkAdd(data.transactions);
  if (data.notes.length) await db.notes.bulkAdd(data.notes);
  if (data.categories.length) await db.categories.bulkAdd(data.categories);
  if (data.balance && Number.isFinite(data.balance.amount) && data.balance.effectiveAt) {
    await db.balanceSnapshots.put({ id: 1, amount: data.balance.amount, effectiveAt: data.balance.effectiveAt });
  }
  // Re-init presets if no categories were imported
  const count = await db.categories.count();
  if (count === 0) await initCategories();
}

export async function getBalanceSnapshot() {
  return db.balanceSnapshots.get(1);
}

export async function setBalanceSnapshot(amount: number) {
  const snapshot: BalanceSnapshot = { id: 1, amount, effectiveAt: new Date().toISOString() };
  await db.balanceSnapshots.put(snapshot);
  return snapshot;
}

export async function getCurrentBalance() {
  const snapshot = await getBalanceSnapshot();
  if (!snapshot) return null;
  const transactions = await db.transactions.where('createdAt').aboveOrEqual(snapshot.effectiveAt).toArray();
  return snapshot.amount + transactions.reduce((total, tx) => total + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
}

export async function initCategories() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(
      presetCategories.map((c, idx) => ({ ...c, id: idx + 1 } as Category))
    );
  }
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return db.transactions.add({
    ...tx,
    createdAt: now,
    updatedAt: now,
  } as Transaction);
}

export async function updateTransaction(id: number, tx: Partial<Transaction>) {
  return db.transactions.update(id, {
    ...tx,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(id: number) {
  return db.transactions.delete(id);
}

export async function getTransactionsByMonth(year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db.transactions
    .where('date')
    .startsWithAnyOfIgnoreCase(prefix)
    .reverse()
    .sortBy('date');
}

export async function getTransactionsByYear(year: number) {
  const prefix = `${year}-`;
  return db.transactions
    .where('date')
    .startsWithAnyOfIgnoreCase(prefix)
    .reverse()
    .sortBy('date');
}

export async function getAllTransactions() {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function getTransactionsByDateRange(startDate: string, endDate: string) {
  return db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .sortBy('date');
}

// Note CRUD
export async function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return db.notes.add({
    ...note,
    createdAt: now,
    updatedAt: now,
  } as Note);
}

export async function updateNote(id: number, note: Partial<Note>) {
  return db.notes.update(id, {
    ...note,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteNote(id: number) {
  return db.notes.delete(id);
}

export async function getAllNotes() {
  return db.notes.orderBy('updatedAt').reverse().toArray();
}

// Category CRUD
export async function getCategories() {
  return db.categories.orderBy('order').toArray();
}

export async function addCategory(cat: Omit<Category, 'id'>) {
  return db.categories.add(cat as Category);
}

export async function updateCategory(id: number, cat: Partial<Category>) {
  return db.categories.update(id, cat);
}

export async function deleteCategory(id: number) {
  return db.categories.delete(id);
}

export async function getCategoryById(id: number | undefined) {
  if (!id) return null;
  return db.categories.get(id);
}

// Task CRUD
export async function addTask(task: Omit<Task, 'id'>) {
  return db.tasks.add(task as Task);
}

export async function updateTask(id: number, task: Partial<Task>) {
  return db.tasks.update(id, task);
}

export async function deleteTask(id: number) {
  return db.tasks.delete(id);
}

export async function getTasksByDate(date: string) {
  return db.tasks.where('date').equals(date).toArray();
}

export async function getAllTasks() {
  return db.tasks.orderBy('date').reverse().toArray();
}
