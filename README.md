# 鑫菲日记

**把生活的点滴与每一笔收支，记录在同一个地方。**

鑫菲日记是一款面向日常使用的记事记账应用，可在浏览器中使用，也可打包为 Android 应用。数据保存在当前设备，支持手动导出和导入。

[下载页面](https://github.com/chxlovezmf/xinAIfei/releases) · [功能介绍](#主要功能) · [运行项目](#运行项目) · [数据与备份](#数据与备份)

## 主要功能

- **记账**：记录收入和支出，支持自定义分类、图标与颜色，以及搜索、排序和按月或年查看。
- **月度预算**：为衣、食、住、行设置额度，将支出分类关联到预算，查看已用、剩余和超额金额。
- **记事**：记录日记和日程，支持日记搜索、置顶及日程完成状态。
- **统计**：查看收支、分类占比和支出趋势，支持按月份或自定义日期范围查看，并导出账目表格。
- **个性化**：支持花漾粉与布布一二主题、深色模式，以及自定义头像和首页卡片背景。

## 安装与使用

前往 [Releases](https://github.com/chxlovezmf/xinAIfei/releases) 查看可用的 Android 安装包和更新说明。若当前版本还没有安装包，可以按下方步骤自行构建。

打开应用后，在「记账」页面右下角添加收支；展开「月度预算」可以设置额度和分类。关于买菜、日用品等如何分类，可查看预算中的「分类怎么记？」说明。

## 数据与备份

- 账目、日记、分类、余额和预算记录保存在当前设备；目前没有云同步。浏览器和 Android 应用各自保存数据，不会自动互通。
- 可以在「设置 → 数据管理」中导出或导入备份。当前备份包含账目、日记、分类、余额和预算设置；**日程、头像和首页自定义设置暂不包含在备份中**。
- 导入备份会替换设备上的相关数据；换手机、卸载或清除应用数据前，请先妥善保管备份文件。

## 运行项目

需要 Node.js 和 npm。在项目目录打开终端：

```bash
npm install
npm run dev
```

根据终端显示的本地地址，在浏览器打开应用。按 `Ctrl+C` 停止开发服务器。

构建和预览：

```bash
npm run build
npm run preview
```

### 构建 Android 版本

安装 Android Studio 和项目所需的 Android SDK 后，在项目目录执行：

```bash
npm run build
npx cap copy android
```

随后用 Android Studio 打开 `android` 目录，等待 Gradle 同步完成，通过 **Build → Build Bundle(s) / APK(s) → Build APK(s)** 生成调试安装包。更改 Capacitor 插件或原生依赖后，应使用 `npx cap sync android` 同步。

## 技术组成

React、TypeScript、Vite、Tailwind CSS、Dexie（IndexedDB）、Chart.js 和 Capacitor。
