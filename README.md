# 私人档案 · Recorder

> 速记 → 日志 → 知识，三层私人记录系统。
> 只属于你一个人：没有账号，没有云端，数据全在本机，随时导出为标准 Markdown。

## 三层结构

| 层 | 做什么 | 节奏 | 落在哪 |
|---|---|---|---|
| **Ⅰ 速记** | 捕捉。不分类、不整理，一行一念 | 10 秒 | `inbox/` |
| **Ⅱ 日志** | 聚焦。五个固定格子，五分钟 | 每天 | `journal/` |
| **Ⅲ 库** | 固化。一条笔记一个想法，可溯源 | 每周 | `knowledge/` |

## 特性

- **本地优先**：IndexedDB 存储，Service Worker 全量预缓存，装到桌面后完全离线可用
- **数据自由**：一键导出 `zip`，内含 Markdown 目录树（Obsidian 直接打开）与 `data.json`（无损还原）
- **三套纸色**：墨（墨绿）/ 霁（靛蓝）/ 陶（赤陶），各配浅色与深色两态
- **内置 AI 整理**：填上自己的 OpenAI 兼容接口，它只出建议，写不写由你决定
- **分享即速记**：PWA Share Target，从任何 App 分享进来直接落进 inbox

## 本地开发

```bash
npm install
npm run dev          # 开发
npm run build        # 构建到 dist/
npm run preview      # 预览构建产物
npm run icons        # 重新生成 PWA 图标
node scripts/fetch-fonts.mjs   # 重新拉取自托管字体
node scripts/serve-subpath.mjs 4181   # 以 GitHub Pages 的子路径形态本地预览
```

## 部署

推送到 `main` 分支，GitHub Actions 自动构建并发布到 Pages。
在仓库 **Settings → Pages** 里把 Source 选成 **GitHub Actions**。

## 技术栈

Vite 7 · React 19 · TypeScript · Tailwind CSS 4 · Dexie 4 · Zustand 5 · vite-plugin-pwa

## 数据在哪

全在本机浏览器的 IndexedDB 里，不联网上报任何东西。
想搬家就导出一个 zip —— 拿到的就是全部。
