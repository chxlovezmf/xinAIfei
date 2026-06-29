# 记一记 - 记事记账本使用说明

## 一、日常启动（浏览器版）

在项目目录下打开终端，输入：

```bash
npm run build && npm run preview
npm run dev
```

终端会显示地址（如 `http://localhost:4173或http://localhost:5173/`），浏览器打开就能用。

想关掉输入 `npx kill-port 4173或ctrl+c`。浏览器还显示页面没关系，那是缓存，端口已经关了。

---

## 二、手机安装（APK 版）

### 第一次打包 APK

1. 打开 Android Studio
2. 项目目录下的 `android` 文件夹 → 点"打开"
3. 等右下角进度条跑完（第一次较慢，会下载依赖）
4. 点顶部菜单：`Build → Build Bundle(s) / APK → Build APK`
5. 完成后点通知里的 `locate`，或者去：
   `android\app\build\outputs\apk\debug\app-debug.apk`
6. 把这个 APK 传到手机安装

### 修改后重新打包

改了代码之后，按顺序执行：

```bash
npm run build                   # 重新构建网页
npx cap copy android            # 同步到安卓项目
```

然后打开 Android Studio，先点击 `Build → Clean Project（清理缓存，确保不复用旧文件）` 再点击 `Build → Build APK`，等一会就生成新的安装包了。

传到手机上安装，会提示"是否更新？"，点是就行，数据不会丢。

---

## 三、项目结构速览

| 文件夹/文件 | 作用 |
|---|---|
| `src/pages/` | 各个页面（首页、记账、记事、统计、设置） |
| `src/components/` | 按钮、弹窗等界面零件 |
| `src/db/` | 数据存储逻辑 |
| `src/types/` | 数据类型定义 |
| `src/utils/` | 辅助功能（格式化、导出 Excel） |
| `android/` | Android 项目（打包时打开这个） |
| `dist/` | 构建后的网页文件（自动生成，不用管） |

---

## 四、常用命令

```bash
npm run dev       # 启动开发服务器（改代码时实时预览）
npm run build     # 构建项目（生成 dist/ 文件夹）
npm run preview   # 预览构建后的版本
```

---

## 五、注意事项

- APK 里的数据和浏览器版的数据**不互通**，各存各的
- 覆盖安装 APK 不会丢失数据
- 如果你换了手机，目前没有云同步，数据需要手动从旧手机导出再导入新手机（设置页有导入导出功能）
- 如果想加新功能或修 Bug，到 `src/` 下找到对应的页面文件修改就行
