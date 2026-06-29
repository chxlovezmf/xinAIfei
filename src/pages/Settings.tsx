/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Database, Download, Upload, Palette, Info } from "lucide-react";
import type { Category } from "../types";
import { getCategories, addCategory, deleteCategory } from "../db/database";
import { PageTransition } from "../components/Layout";
import { useDarkMode } from "../hooks/useDarkMode";
import { exportAllData, importAllData } from "../utils/export";
import { getAllTransactions, getAllNotes } from "../db/database";

export default function Settings() {
  const { isDark, toggle } = useDarkMode();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");
  const [importStatus, setImportStatus] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const APP_VERSION = '1.1.0';
  const DEFAULT_ABOUT_TEXT = "想把和她的一辈子都记录在这里";
  if (localStorage.getItem('aboutTextVersion') !== APP_VERSION) {
    localStorage.removeItem('aboutText');
    localStorage.setItem('aboutTextVersion', APP_VERSION);
  }
  const aboutText = localStorage.getItem("aboutText") || DEFAULT_ABOUT_TEXT;
  const [editAbout, setEditAbout] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleExport = async () => {
    const [txs, notes, cats] = await Promise.all([getAllTransactions(), getAllNotes(), getCategories()]);
    exportAllData(txs, notes, cats);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = importAllData(text);
      if (data) {
        setImportStatus("发现 " + data.transactions.length + " 条账目、" + data.notes.length + " 条笔记、" + data.categories.length + " 个分类");
      } else {
        setImportStatus("文件格式不正确");
      }
    };
    input.click();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addCategory({
      name: newCatName.trim(),
      type: newCatType,
      icon: "more-horizontal",
      color: "#6b7280",
      order: 99,
      preset: false,
    });
    setNewCatName("");
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleDeleteCategory = async (id: number) => {
    await deleteCategory(id);
    const cats = await getCategories();
    setCategories(cats);
  };

  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  return (
    <PageTransition>
      <div className="page-container">
        <h1 className="page-title mb-4">设置</h1>

        {/* Dark Mode */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700">
              {isDark ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">深色模式</p>
              <p className="text-xs text-gray-400">切换界面主题</p>
            </div>
          </div>
          <button onClick={toggle} className={"relative h-6 w-11 rounded-full transition-colors " + (isDark ? "bg-primary-500" : "bg-gray-300")}>
            <div className={"absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform " + (isDark ? "translate-x-5" : "")} />
          </button>
        </motion.div>

        {/* Data Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700">
              <Database size={18} className="text-primary-500" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">数据管理</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary flex-1 gap-1 text-xs py-2">
              <Download size={14} />导出备份
            </button>
            <button onClick={handleImport} className="btn-secondary flex-1 gap-1 text-xs py-2">
              <Upload size={14} />导入备份
            </button>
          </div>
          {importStatus && <p className="mt-2 text-xs text-gray-500">{importStatus}</p>}
        </motion.div>

        {/* Category Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700">
              <Palette size={18} className="text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">分类管理</p>
          </div>
          <div className="mb-3 flex gap-2">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden dark:border-gray-700">
              <button onClick={() => setNewCatType("expense")} className={"px-3 py-1.5 text-xs font-medium " + (newCatType === "expense" ? "bg-red-500 text-white" : "bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                支出
              </button>
              <button onClick={() => setNewCatType("income")} className={"px-3 py-1.5 text-xs font-medium " + (newCatType === "income" ? "bg-primary-500 text-white" : "bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                收入
              </button>
            </div>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="分类名称" className="input-field flex-1 text-sm py-1.5" onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
            <button onClick={handleAddCategory} className="btn-primary py-1.5 px-3 text-xs">
              添加
            </button>
          </div>
          <div className="mb-2">
            <p className="mb-1 text-xs text-gray-400">支出分类</p>
            <div className="flex flex-wrap gap-2">
              {expenseCats.map((cat) => (
                <div key={cat.id} className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700">
                  <span className="text-xs text-gray-700 dark:text-gray-300">{cat.name}</span>
                  {!cat.preset && (
                    <button onClick={() => cat.id && handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-400">收入分类</p>
            <div className="flex flex-wrap gap-2">
              {incomeCats.map((cat) => (
                <div key={cat.id} className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700">
                  <span className="text-xs text-gray-700 dark:text-gray-300">{cat.name}</span>
                  {!cat.preset && (
                    <button onClick={() => cat.id && handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => { setShowAbout(true); setEditAbout(aboutText); setEditingAbout(false); }}>
          <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700">
            <Info size={18} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">关于鑫菲日记</p>
            <p className="text-xs text-gray-400">版本 1.1</p>
          </div>
        </motion.div>

        {/* About dialog */}
        <AnimatePresence>
          {showAbout && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setShowAbout(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">鑫菲日记</h3>
                <p className="text-xs text-gray-400 mb-4">版本 1.1</p>
                {editingAbout ? (
                  <div>
                    <textarea value={editAbout} onChange={(e) => setEditAbout(e.target.value)}
                      className="input-field text-sm min-h-[80px] mb-2" autoFocus />
                    <button onClick={() => { localStorage.setItem("aboutText", editAbout); setShowAbout(false); window.location.reload(); }}
                      className="btn-primary text-sm w-full">保存</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{aboutText}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingAbout(true)} className="btn-secondary flex-1 text-sm py-2">编辑寄语</button>
                      <button onClick={() => setShowAbout(false)} className="btn-primary flex-1 text-sm py-2">关闭</button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
