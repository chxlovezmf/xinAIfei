# 记一记 App — 版本更新修改指南

> 每次更新功能后，需要同步修改一些"版本/名称"相关的必要信息。本文档列出所有需要修改的位置、当前值，以及修改步骤。
> 最后更新：2026-08-12（对应 v1.3）

---

## 一、版本号清单（改版本必看）

| 位置 | 文件 | 当前值 | 说明 |
|---|---|---|---|
| 1 | `package.json` | `"version": "1.1.0"` | npm 包版本号，PWA 构建会用它 |
| 2 | `src/pages/Home.tsx:26` | `const APP_VERSION = '1.1.0';` | 首页"关于"卡片用的版本号 |
| 3 | `src/pages/Settings.tsx:52` | `const APP_VERSION = '1.3.0';` | 设置页"关于鑫菲日记"用的版本号 |
| 4 | `src/pages/Settings.tsx:262` | `版本 1.3` | 设置页列表里的版本文字（硬编码） |
| 5 | `src/pages/Settings.tsx:321` | `版本 1.3` | "关于"弹窗里的版本文字（硬编码） |
| 6 | `android/app/build.gradle` | `versionCode 1`、`versionName "1.3"` | Android 应用商店版本。`versionCode` 每次更新**必须 +1**，`versionName` 与上面保持一致 |

> ⚠️ **注意**：目前 2、3 两个 `APP_VERSION` 值**不一致**（Home 是 1.1.0，Settings 是 1.3.0），这是历史遗留。建议更新时统一成同一个新版本号。
>
> ⚠️ `localStorage` 的 `aboutTextVersion` 机制：Settings 页检测到 `APP_VERSION` 变化时会清除用户自定义的"寄语"，恢复默认。这是设计行为，改版本号就会触发一次，属正常现象。

---

## 二、App 名称相关（改名/改描述必看）

| 位置 | 文件 | 当前值 | 说明 |
|---|---|---|---|
| 1 | `index.html` `<title>` | `记一记 - 记事记账本` | 浏览器标签页标题 |
| 2 | `index.html` `apple-mobile-web-app-title` | `记一记` | iOS 添加到主屏幕显示名 |
| 3 | `vite.config.ts` manifest | `name: '记一记 - 记事记账本'`、`short_name: '记一记'` | PWA 安装到桌面的显示名 |
| 4 | `capacitor.config.ts` | `appName: '鑫菲日记'` | Android 原生 App 显示名 |
| 5 | `src/pages/Home.tsx:125` | `鑫菲日记` | 首页大标题 |
| 6 | `src/pages/Settings.tsx:262` / `:325` | `关于鑫菲日记` / `鑫菲日记` | 设置页标题与弹窗标题 |
| 7 | `src/pages/Settings.tsx:55` | `DEFAULT_ABOUT_TEXT = "想把和她的一辈子都记录在这里"` | 默认寄语文案 |

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
3. **改版本号**：同步修改第一节第 1、2、3、4、5、6 项。
   - 建议：Home 和 Settings 的 `APP_VERSION` 统一为一个新值。
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

- **硬编码的"版本 x.x"文字**：Settings.tsx 里有 2 处（262、321 行）是写死的字符串，只改 `APP_VERSION` 常量不会自动更新它们，需要手动一起改。
- **两处 APP_VERSION 不一致**：Home.tsx 和 Settings.tsx 各定义了一份，建议以后收敛为单一来源（例如统一导入）。
- **versionCode**：Android 发布更新时必须递增，否则商店/系统会认为是同一版本拒绝覆盖安装。
- **备份文件里的 version 字段**（`src/utils/export.ts:113`）：`version: '1.0'` 是备份数据格式版本，**只有备份格式变了才改**，不要跟着 App 版本号走。
