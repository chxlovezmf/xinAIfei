import Dexie, { type Table } from 'dexie';
import type { Transaction, Note, Category, Task, BalanceSnapshot, BudgetConfig, DailyPlan, DailyPlanCheck } from '../types';
import { presetCategories } from './categories';

export class AppDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  notes!: Table<Note, number>;
  categories!: Table<Category, number>;
  tasks!: Table<Task, number>;
  balanceSnapshots!: Table<BalanceSnapshot, number>;
  budgets!: Table<BudgetConfig, string>;
  dailyPlans!: Table<DailyPlan, number>;
  dailyPlanChecks!: Table<DailyPlanCheck, string>;

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
    this.version(4).stores({ budgets: 'month' });
    this.version(5).stores({
      dailyPlans: '++id, order',
      dailyPlanChecks: 'id, planId, date',
    });
  }
}

export const db = new AppDatabase();

let categoriesCache: Category[] | null = null;
let categoriesRequest: Promise<Category[]> | null = null;
let categoriesCacheRevision = 0;

export function invalidateCategoriesCache() {
  categoriesCacheRevision += 1;
  categoriesCache = null;
  categoriesRequest = null;
}

// Initialize preset categories if not already present
export async function importData(data: {
  transactions: any[];
  notes: any[];
  categories: any[];
  balance?: BalanceSnapshot | null;
  budgets?: BudgetConfig[];
  dailyPlans?: DailyPlan[];
  dailyPlanChecks?: DailyPlanCheck[];
}) {
  await db.transaction('rw', [db.transactions, db.notes, db.categories, db.balanceSnapshots, db.budgets, db.dailyPlans, db.dailyPlanChecks], async () => {
    await db.transactions.clear();
    await db.notes.clear();
    await db.categories.clear();
    await db.balanceSnapshots.clear();
    await db.budgets.clear();
    await db.dailyPlans.clear();
    await db.dailyPlanChecks.clear();
    if (data.transactions.length) await db.transactions.bulkAdd(data.transactions);
    if (data.notes.length) await db.notes.bulkAdd(data.notes);
    if (data.categories.length) await db.categories.bulkAdd(data.categories);
    if (data.balance && Number.isFinite(data.balance.amount) && data.balance.effectiveAt) {
      await db.balanceSnapshots.put({ id: 1, amount: data.balance.amount, effectiveAt: data.balance.effectiveAt });
    }
    if (data.budgets?.length) await db.budgets.bulkAdd(data.budgets);
    if (data.dailyPlans?.length) await db.dailyPlans.bulkAdd(data.dailyPlans);
    if (data.dailyPlanChecks?.length) await db.dailyPlanChecks.bulkAdd(data.dailyPlanChecks);
    // Re-init presets if no categories were imported
    const count = await db.categories.count();
    if (count === 0) await initCategories();
  });
  invalidateCategoriesCache();
}

export async function getBudgetForMonth(month: string) {
  return db.budgets.where('month').belowOrEqual(month).last();
}

export async function getAllBudgets() { return db.budgets.toArray(); }

export async function saveBudget(config: BudgetConfig) { await db.budgets.put(config); }

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
  invalidateCategoriesCache();
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
  if (categoriesCache) return categoriesCache;
  if (categoriesRequest) return categoriesRequest;

  const requestRevision = categoriesCacheRevision;
  categoriesRequest = db.categories.orderBy('order').toArray().then((categories) => {
    if (requestRevision === categoriesCacheRevision) categoriesCache = categories;
    return categories;
  }).finally(() => {
    categoriesRequest = null;
  });
  return categoriesRequest;
}

export async function addCategory(cat: Omit<Category, 'id'>) {
  const result = await db.categories.add(cat as Category);
  invalidateCategoriesCache();
  return result;
}

export async function updateCategory(id: number, cat: Partial<Category>) {
  const result = await db.categories.update(id, cat);
  invalidateCategoriesCache();
  return result;
}

export async function deleteCategory(id: number) {
  const result = await db.categories.delete(id);
  invalidateCategoriesCache();
  return result;
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

export async function getAllTasks() {
  return db.tasks.orderBy('date').reverse().toArray();
}

// 每日计划：固定任务模板
function normalizePlanDays(days: number[]) {
  const unique = Array.from(new Set(days.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
  // 七天全选等价于“每天”，统一存空数组，避免两套含义
  return unique.length === 7 ? [] : unique;
}

export function isDailyPlanActiveOn(plan: DailyPlan, date: string) {
  return plan.days.length === 0 || plan.days.includes(new Date(`${date}T00:00:00`).getDay());
}

export async function getDailyPlans() {
  return db.dailyPlans.orderBy('order').toArray();
}

export async function addDailyPlan(input: { text: string; days: number[] }) {
  const now = new Date().toISOString();
  const last = await db.dailyPlans.orderBy('order').last();
  return db.dailyPlans.add({
    text: input.text,
    days: normalizePlanDays(input.days),
    order: (last?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  } as DailyPlan);
}

export async function updateDailyPlan(id: number, patch: Partial<Pick<DailyPlan, 'text' | 'days' | 'order'>>) {
  const next: Partial<DailyPlan> = { ...patch, updatedAt: new Date().toISOString() };
  if (patch.days) next.days = normalizePlanDays(patch.days);
  return db.dailyPlans.update(id, next);
}

export async function deleteDailyPlan(id: number) {
  await db.transaction('rw', [db.dailyPlans, db.dailyPlanChecks], async () => {
    await db.dailyPlanChecks.where('planId').equals(id).delete();
    await db.dailyPlans.delete(id);
  });
}

// 交换两个计划在完整列表中的位置，用于当前可见清单内的上下移动
export async function swapDailyPlanOrder(id: number, targetId: number) {
  const plans = await getDailyPlans();
  const index = plans.findIndex(plan => plan.id === id);
  const targetIndex = plans.findIndex(plan => plan.id === targetId);
  if (index < 0 || targetIndex < 0 || index === targetIndex) return;
  const next = [...plans];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  const now = new Date().toISOString();
  await db.dailyPlans.bulkPut(next.map((plan, order) => ({ ...plan, order, updatedAt: now })));
}

// 每日计划：每天的打勾记录（只保存完成项，取消完成即删除）
export async function getDailyPlanChecksBetween(startDate: string, endDate: string) {
  return db.dailyPlanChecks.where('date').between(startDate, endDate, true, true).toArray();
}

export async function getDailyPlanChecksByDate(date: string) {
  return db.dailyPlanChecks.where('date').equals(date).toArray();
}

export async function getAllDailyPlanChecks() {
  return db.dailyPlanChecks.toArray();
}

export async function setDailyPlanCheck(planId: number, date: string, done: boolean) {
  const id = `${planId}_${date}`;
  if (!done) {
    await db.dailyPlanChecks.delete(id);
    return;
  }
  await db.dailyPlanChecks.put({ id, planId, date, done: true, updatedAt: new Date().toISOString() });
}
