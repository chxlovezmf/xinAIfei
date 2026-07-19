/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Database, Download, Upload, Palette, Info, HardDrive, CheckCircle, XCircle } from "lucide-react";
import type { Category } from "../types";
import dayjs from "dayjs";
import { getCategories, addCategory, deleteCategory, updateCategory, getAllTransactions, getAllNotes, importData } from "../db/database";
import { PageTransition } from "../components/Layout";
import { useDarkMode } from "../hooks/useDarkMode";
import { exportAllData, importAllData, getExportDataString, copyToClipboard, nativeExport, shareExportFile, listBackupFiles, readBackupFile, type BackupFileInfo } from "../utils/export";

const COLOR_PALETTE = ['#ef4444','#f97316','#f59e0b','#eab308','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#78716c','#6b7280'];
const GENERIC_ICONS = ['more-horizontal','circle','box','tag','star','heart','zap','flag'];
function getRandomColor(): string { return COLOR_PALETTE[Math.floor(Math.random()*COLOR_PALETTE.length)]; }
function getRandomIcon(): string { return GENERIC_ICONS[Math.floor(Math.random()*GENERIC_ICONS.length)]; }

export default function Settings() {
  const { isDark, toggle } = useDarkMode();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense"|"income">("expense");
  const [newCatColor, setNewCatColor] = useState(getRandomColor());
  const [importStatus, setImportStatus] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showRestoreList, setShowRestoreList] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [editCat, setEditCat] = useState<Category|null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const [toast, setToast] = useState<{type:'success'|'error';message:string}|null>(null);
  const [storageSize, setStorageSize] = useState("");
  const [avatarSize, setAvatarSize] = useState("");
  const [bgSize, setBgSize] = useState("");

  const showToast = (type:'success'|'error', message:string) => { setToast({type,message}); setTimeout(()=>setToast(null),3000); };
  const formatBytes = (b:number) => b<1024 ? b+' B' : b<1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

  useEffect(()=>{
    (async()=>{
      try {
        const [txs,notes,cats] = await Promise.all([getAllTransactions(),getAllNotes(),getCategories()]);
        const dbBytes = new TextEncoder().encode(JSON.stringify({transactions:txs,notes:notes,categories:cats})).length;
        setStorageSize(formatBytes(dbBytes));
        const av = localStorage.getItem('avatar')||'', bg = localStorage.getItem('cardBg')||'';
        setAvatarSize(av?formatBytes(new TextEncoder().encode(av).length):'未设置');
        setBgSize(bg?formatBytes(new TextEncoder().encode(bg).length):'未设置');
      } catch { setStorageSize('未知'); }
    })();
  },[]);

  const APP_VERSION = '1.3.0';
  const DEFAULT_ABOUT_TEXT = "想把和她的一辈子都记录在这里";
  if (localStorage.getItem('aboutTextVersion')!==APP_VERSION) { localStorage.removeItem('aboutText'); localStorage.setItem('aboutTextVersion',APP_VERSION); }
  const aboutText = localStorage.getItem("aboutText")||DEFAULT_ABOUT_TEXT;
  const [editAbout, setEditAbout] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);

  useEffect(()=>{ getCategories().then(setCategories); },[]);

  const handleExportToFile = async () => {
    const [txs,notes,cats] = await Promise.all([getAllTransactions(),getAllNotes(),getCategories()]);
    const jsonStr = getExportDataString(txs, notes, cats);
    const fileName = `记一记_数据备份_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    const saved = await nativeExport(jsonStr, fileName);
    if (saved) {
      const shared = await shareExportFile(jsonStr, fileName);
      if (shared) {
        showToast('success','文件已导出，选择"保存到文件"即可存到手机可见位置');
      } else {
        showToast('success','备份已保存到"文档"文件夹，打开手机"文件管理"可找到');
      }
    } else {
      exportAllData(txs,notes,cats);
      showToast('success','文件已下载到本地');
    }
  };
  const handleExportToClipboard = async () => {
    const [txs,notes,cats] = await Promise.all([getAllTransactions(),getAllNotes(),getCategories()]);
    const jsonStr = getExportDataString(txs, notes, cats);
    const ok = await copyToClipboard(jsonStr);
    if (ok) {
      showToast('success','数据已复制到剪贴板，粘贴到备忘录等地方保存即可');
    } else {
      showToast('error','复制失败，请使用导出为文件方式');
    }
  };
  const handleImport = () => {
    const input = document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return;
      const text = await file.text();
      // Remove BOM if present
      const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
      const data = importAllData(cleanText);
      if(data) { await importData(data); setImportStatus("发现 "+data.transactions.length+" 条账目、"+data.notes.length+" 条笔记、"+data.categories.length+" 个分类"); showToast('success','数据导入成功'); }
      else { setImportStatus("文件格式不正确，请检查备份文件"); showToast('error','文件格式不正确'); }
    }; input.click();
  };
  const handlePasteImportConfirm = async () => {
    const data = importAllData(pasteText);
    if(data) { await importData(data); setImportStatus("发现 "+data.transactions.length+" 条账目、"+data.notes.length+" 条笔记、"+data.categories.length+" 个分类"); showToast('success','数据导入成功'); setShowPasteImport(false); setPasteText(""); }
    else { showToast('error','粘贴内容不是有效的备份数据，请检查是否完整复制了全部JSON'); }
  };
  const handleShowRestore = async () => {
    const files = await listBackupFiles();
    setBackupFiles(files);
    setShowRestoreList(true);
  };
  const handleRestoreFromFile = async (path: string) => {
    setShowRestoreList(false);
    const text = await readBackupFile(path);
    if (!text) { showToast('error','无法读取备份文件'); return; }
    const data = importAllData(text);
    if (!data) { showToast('error','文件内容格式不正确'); return; }
    await importData(data);
    setImportStatus("发现 "+data.transactions.length+" 条账目、"+data.notes.length+" 条笔记、"+data.categories.length+" 个分类");
    showToast('success','数据恢复成功');
  };

  const handleAddCategory = async () => {
    if(!newCatName.trim()) return;
    await addCategory({name:newCatName.trim(),type:newCatType,icon:getRandomIcon(),color:newCatColor,order:99,preset:false});
    setNewCatName(""); setNewCatColor(getRandomColor());
    setCategories(await getCategories());
  };
  const handleDeleteCategory = async (id:number) => { await deleteCategory(id); setCategories(await getCategories()); };
  const handleEditCategory = (cat: Category) => {
    setEditCat(cat);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };
  const handleSaveCategoryEdit = async () => {
    if (!editCat || !editCat.id || !editCatName.trim()) return;
    await updateCategory(editCat.id, { name: editCatName.trim(), color: editCatColor });
    setEditCat(null);
    setCategories(await getCategories());
    showToast('success','分类已更新');
  };

  const expenseCats = categories.filter(c=>c.type==="expense");
  const incomeCats = categories.filter(c=>c.type==="income");

  return (
    <PageTransition>
      <div className="page-container">
        <h1 className="page-title mb-4">设置</h1>

        <div className="card mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700">{isDark?<Moon size={18} className="text-blue-400"/>:<Sun size={18} className="text-amber-500"/>}</div>
            <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">深色模式</p><p className="text-xs text-gray-400">切换界面主题</p></div>
          </div>
          <button onClick={toggle} className={"relative h-6 w-11 rounded-full transition-colors "+(isDark?"bg-primary-500":"bg-gray-300")}>
            <div className={"absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform "+(isDark?"translate-x-5":"")}/>
          </button>
        </div>

        <div className="card mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700"><Database size={18} className="text-primary-500"/></div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">数据管理</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportToFile} className="btn-secondary flex-1 gap-1 text-xs py-2"><Download size={14}/>导出为文件</button>
            <button onClick={handleExportToClipboard} className="btn-secondary flex-1 gap-1 text-xs py-2"><Download size={14}/>复制到剪贴板</button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleImport} className="btn-secondary flex-1 gap-1 text-xs py-2"><Upload size={14}/>导入文件</button>
            <button onClick={handleShowRestore} className="btn-secondary flex-1 gap-1 text-xs py-2"><Download size={14}/>本地恢复（Android）</button>
          </div>
          <button onClick={()=>{setShowPasteImport(true);setPasteText("");}} className="btn-secondary mt-2 w-full gap-1 text-xs py-2"><Upload size={14}/>粘贴导入（备用）</button>
          {importStatus&&<p className="mt-2 text-xs text-gray-500">{importStatus}</p>}
        </div>

        <div className="card mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700"><HardDrive size={18} className="text-gray-500"/></div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">存储空间</p>
            </div>
            <button onClick={()=>{
              if(window.confirm('确定要清除所有数据吗？此操作不可恢复！\n\n建议先导出备份再清除。')) {
                import('../db/database').then(async({db})=>{await db.transactions.clear();await db.notes.clear();await db.categories.clear();await db.tasks.clear();
                  const{initCategories}=await import('../db/database');await initCategories();
                  showToast('success','数据已清除，请在手机设置中清除应用缓存后重新打开');
                });
              }
            }} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30">清除数据</button>
          </div>
          {(avatarSize&&avatarSize!=='未设置')||(bgSize&&bgSize!=='未设置')?(
            <div className="mb-3 flex gap-2">
              <button onClick={()=>{localStorage.removeItem('avatar');showToast('success','头像已清除');setTimeout(()=>window.location.reload(),1000);}} className="flex-1 rounded-lg bg-gray-50 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">清除头像（{avatarSize}）</button>
              <button onClick={()=>{localStorage.removeItem('cardBg');showToast('success','背景图已清除，将恢复默认');setTimeout(()=>window.location.reload(),1000);}} className="flex-1 rounded-lg bg-gray-50 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">清除背景图（{bgSize}）</button>
            </div>
          ):null}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">账目/日记记录</span><span className="text-gray-700 dark:text-gray-300">{storageSize}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">头像图片</span><span className="text-gray-700 dark:text-gray-300">{avatarSize}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">背景图片</span><span className="text-gray-700 dark:text-gray-300">{bgSize}</span></div>
            <div className="border-t border-gray-100 pt-1 dark:border-gray-700"/>
            <div className="flex justify-between font-medium"><span className="text-gray-600 dark:text-gray-400">本地存储总计</span><span className="text-gray-800 dark:text-gray-200">{avatarSize&&bgSize?formatBytes((()=>{const a=(localStorage.getItem('avatar')||'').length,b=(localStorage.getItem('cardBg')||'').length;return a+b;})()):'计算中...'}</span></div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700"><Palette size={18} className="text-purple-500"/></div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">分类管理</p>
          </div>
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden dark:border-gray-700">
                <button onClick={()=>setNewCatType("expense")} className={"px-3 py-1.5 text-xs font-medium "+(newCatType==="expense"?"bg-red-500 text-white":"bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>支出</button>
                <button onClick={()=>setNewCatType("income")} className={"px-3 py-1.5 text-xs font-medium "+(newCatType==="income"?"bg-primary-500 text-white":"bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>收入</button>
              </div>
              <input type="text" value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="分类名称" className="input-field flex-1 text-sm py-1.5" onKeyDown={e=>e.key==="Enter"&&handleAddCategory()}/>
              <button onClick={handleAddCategory} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">添加</button>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-400">选择颜色</p>
              <div className="flex flex-wrap gap-2">{COLOR_PALETTE.map(color=>(
                <button key={color} onClick={()=>setNewCatColor(color)} className="h-6 w-6 rounded-full transition-all active:scale-90" style={{backgroundColor:color}}>
                  {newCatColor===color&&<svg className="mx-auto text-white" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              ))}</div>
            </div>
          </div>
          <div className="mb-2">
            <p className="mb-1 text-xs text-gray-400">支出分类</p>
            <div className="flex flex-wrap gap-2">{expenseCats.map(cat=>(
              <div key={cat.id} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor:cat.color}}/>
                <span className="text-xs text-gray-700 dark:text-gray-300">{cat.name}</span>
                <button onClick={()=>handleEditCategory(cat)} className="text-gray-400 hover:text-primary-500 ml-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                {!cat.preset&&<button onClick={()=>cat.id&&handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-400 ml-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></button>}
              </div>
            ))}</div>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-400">收入分类</p>
            <div className="flex flex-wrap gap-2">{incomeCats.map(cat=>(
              <div key={cat.id} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor:cat.color}}/>
                <span className="text-xs text-gray-700 dark:text-gray-300">{cat.name}</span>
                <button onClick={()=>handleEditCategory(cat)} className="text-gray-400 hover:text-primary-500 ml-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                {!cat.preset&&<button onClick={()=>cat.id&&handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-400 ml-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></button>}
              </div>
            ))}</div>
          </div>
        </div>

        <div className="card flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform" onClick={()=>{setShowAbout(true);setEditAbout(aboutText);setEditingAbout(false);}}>
          <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-700"><Info size={18} className="text-gray-400"/></div>
          <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">关于鑫菲日记</p><p className="text-xs text-gray-400">版本 1.3</p></div>
        </div>

        <AnimatePresence>{showPasteImport&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setShowPasteImport(false)}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">粘贴导入</h3>
              <p className="text-xs text-gray-400 mb-3">复制备份的完整JSON内容，粘贴到下方文本框中</p>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} className="input-field text-xs min-h-[200px] mb-3 font-mono leading-relaxed" placeholder='{"version":"1.0","transactions":[...]}'/>
              <div className="flex gap-2">
                <button onClick={()=>setShowPasteImport(false)} className="btn-secondary flex-1 text-sm py-2">取消</button>
                <button onClick={handlePasteImportConfirm} className="btn-primary flex-1 text-sm py-2" disabled={!pasteText.trim()}>确认导入</button>
              </div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>

        <AnimatePresence>{showRestoreList&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setShowRestoreList(false)}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 max-h-[70vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">从本地备份恢复</h3>
              <p className="text-xs text-gray-400 mb-3">选择手机 Documents 中的备份文件</p>
              {backupFiles.length===0?(
                <div className="py-8 text-center text-sm text-gray-400">未找到备份文件<br/>请先在"导出并复制"中导出一次</div>
              ):(
                <div className="space-y-2">{backupFiles.map(f=>(
                  <button key={f.name} onClick={()=>handleRestoreFromFile(f.path)} className="w-full rounded-xl bg-gray-50 p-3 text-left hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 active:scale-[0.98] transition-transform">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.name}</p>
                    <p className="text-xs text-gray-400">{f.size>0?(f.size/1024).toFixed(1)+' KB':''}</p>
                  </button>
                ))}</div>
              )}
              <button onClick={()=>setShowRestoreList(false)} className="btn-secondary w-full text-sm py-2 mt-3">关闭</button>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>

        <AnimatePresence>{editCat&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setEditCat(null)}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">编辑分类</h3>
              <p className="text-xs text-gray-400 mb-2">{editCat.preset?'预设分类':'自定义分类'} · {editCat.type==='expense'?'支出':'收入'}</p>
              <input type="text" value={editCatName} onChange={e=>setEditCatName(e.target.value)} placeholder="分类名称" className="input-field text-sm mb-3"/>
              <p className="mb-1 text-xs text-gray-400">选择颜色</p>
              <div className="flex flex-wrap gap-2 mb-4">{COLOR_PALETTE.map(color=>(
                <button key={color} onClick={()=>setEditCatColor(color)} className="h-7 w-7 rounded-full transition-all active:scale-90" style={{backgroundColor:color}}>
                  {editCatColor===color&&<svg className="mx-auto text-white" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              ))}</div>
              <div className="flex gap-2">
                <button onClick={()=>setEditCat(null)} className="btn-secondary flex-1 text-sm py-2">取消</button>
                <button onClick={handleSaveCategoryEdit} className="btn-primary flex-1 text-sm py-2" disabled={!editCatName.trim()}>保存</button>
              </div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>

        <AnimatePresence>{showAbout&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setShowAbout(false)}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">鑫菲日记</h3>
              <p className="text-xs text-gray-400 mb-4">版本 1.3</p>
              {editingAbout?(
                <div>
                  <textarea value={editAbout} onChange={e=>setEditAbout(e.target.value)} className="input-field text-sm min-h-[80px] mb-2" autoFocus/>
                  <button onClick={()=>{localStorage.setItem("aboutText",editAbout);setShowAbout(false);window.location.reload();}} className="btn-primary text-sm w-full">保存</button>
                </div>
              ):(
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{aboutText}</p>
                  <div className="flex gap-2">
                    <button onClick={()=>setEditingAbout(true)} className="btn-secondary flex-1 text-sm py-2">编辑寄语</button>
                    <button onClick={()=>setShowAbout(false)} className="btn-primary flex-1 text-sm py-2">关闭</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}</AnimatePresence>

        <AnimatePresence>{toast&&(
          <motion.div initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} exit={{opacity:0,y:50}} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
            <div className={"flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg backdrop-blur-lg text-sm font-medium "+(toast.type==='success'?'bg-primary-500 text-white':'bg-red-500 text-white')}>
              {toast.type==='success'?<CheckCircle size={18}/>:<XCircle size={18}/>}
              {toast.message}
            </div>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </PageTransition>
  );
}
