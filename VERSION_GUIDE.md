# 鑫菲日记 App — 版本更新修改指南

> 每次更新功能后，需要同步修改一些"版本/名称"相关的必要信息。本文档列出所有需要修改的位置、当前值，以及修改步骤。
> 最后更新：2026-10-29（对应 v1.6.0）

---

## 一、版本号清单（改版本必看）

| 位置 | 文件 | 当前值 | 说明 |
|---|---|---|---|
| 1 | `package.json` | `"version": "1.6.0"` | 应用版本；设置页直接读取此值 |
| 2 | `package-lock.json` | 根项目版本 `1.6.0` | 与 `package.json` 保持一致，不修改依赖自身的版本 |
| 3 | `android/app/build.gradle` | `versionCode 5`、`versionName "1.6.0"` | Android 版本；发布新版本时递增 versionCode，versionName 与应用版本一致 |

> 设置页版本号来自 `package.json`。升级版本不会清除用户自定义寄语。

---

## 二、App 名称相关（改名/改描述必看）

| 位置 | 文件 | 当前值 | 说明 |
|---|---|---|---|
| 1 | `index.html` `<title>` | `鑫菲日记 - 记事记账本` | 浏览器标签页标题 |
| 2 | `index.html` `apple-mobile-web-app-title` | `鑫菲日记` | iOS 添加到主屏幕显示名 |
| 3 | `vite.config.ts` manifest | `name: '鑫菲日记 - 记事记账本'`、`short_name: '鑫菲日记'` | PWA 安装到桌面的显示名 |
| 4 | `capacitor.config.ts` | `appName: '鑫菲日记'` | Android 原生 App 显示名 |
| 5 | `src/pages/Home.tsx:125` | `鑫菲日记` | 首页大标题 |
| 6 | `src/pages/Settings.tsx:274` / `:337` | `关于鑫菲日记` / `鑫菲日记` | 设置页标题与弹窗标题 |
| 7 | `src/pages/Settings.tsx` | `想把和她的一辈子都记录在这里` | 默认寄语文案，已有自定义寄语优先显示 |

---

## 三、数据库结构变更（新增表/字段必看）

数据库用 Dexie（IndexedDB），文件：`src/db/database.ts`。

```ts
this.version(1).stores({ ... });   // 初始结构
this.version(2).stores({ ... });   // 后来加了 tasks 表
```

- **新增表 或 修改字段索引**：必须在末尾追加 `this.version(N).stores({ ... })`（N = 当前最大版本 + 1）。
- **不要删掉旧版本**：Dexie 靠版本链做升级迁移，删了会导致老用户升级报错。
- **新增字段（非索引）**：一般不需要加版本，Dexie 存储记录时缺字段会自动补 `undefined`，但若新代码强依赖该字段，建议在代码里做兜底默认值。

---

## 四、PWA 相关

- 配置文件：`vite.config.ts` 的 `VitePWA({ manifest: {...} })`。
- `registerType: 'autoUpdate'` 已开启，Web 端用户刷新即可拿到新版本，**无需手动改 SW 版本号**。
- 改图标：替换 `public/favicon.svg` 即可；manifest 里已引用 `/favicon.svg`。
- 主题色：`vite.config.ts` 的 `theme_color` 与 `index.html` 的 `<meta name="theme-color">`，两处都要改。

---

## 五、标准更新流程（推荐顺序）

1. **写代码**：实现新功能。
2. **更新数据库版本**（如有结构变更）→ 见第三节。
3. **改版本号**：同步修改第一节的项目版本、锁文件根版本和 Android 版本。
   - `android/app/build.gradle` 的 `versionCode` **必须 +1**（商店发布强制），`versionName` 保持一致。
4. **改名称/文案**（如有需要）→ 见第二节。
5. **本地验证**：
   ```bash
   npm run dev      # 开发预览
   npm run build    # 类型检查 + 生产构建（会生成 PWA dist/）
   ```
6. **Android 打包**（如发布到手机）：
   ```bash
   npx cap sync android   # 把新的 dist/ 同步进 Android 工程
   ```
   然后在 Android Studio 里构建 APK。
7. **提交 git**（用户自己确认后执行）。

---

## 六、易漏点提醒

- **设置页版本**：直接读取 `package.json`，不用再分别修改两处显示文字。
- **versionCode**：Android 发布更新时必须递增，否则商店/系统会认为是同一版本拒绝覆盖安装。
- **备份文件名兼容**：新备份使用 `鑫菲日记_数据备份_` 前缀，恢复列表仍兼容旧的 `记一记_数据备份_` 前缀。
- **备份文件里的 version 字段**（`src/utils/export.ts`）：当前 `1.2` 是备份数据格式版本，只有备份格式变了才改，不跟随 App 版本号。
