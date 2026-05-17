# DeepDive · AI 深度知识探索

> 输入任意概念，DeepSeek 生成解释，关键术语自动高亮成可点击链接，无限钻取并自动构建学习路径树。

**Live Demo（`local-only` 分支）：** [https://deepdive-7d8.pages.dev/](https://deepdive-7d8.pages.dev/) · 部署于 Cloudflare Pages

> 首次使用需要在首页填一个 [DeepSeek API Key](https://platform.deepseek.com/api_keys)，Key 仅保存在你的浏览器本地（localStorage），不会上传任何服务器。

---

## 截图

桌面端三栏布局：左侧探索路径树 · 中间 AI 生成正文（关键术语高亮可点击）· 右侧历史。
<img width="1920" height="959" alt="QQ20260517-154629" src="https://github.com/user-attachments/assets/e8c556d0-ffdd-4bd8-a121-afcf8689b922" />

---

## 分支策略

仓库有两条并行实现，按需切换：

| 分支 | 形态 | 数据 | 鉴权 | 适用场景 |
|------|------|------|------|----------|
| **`main`** | 前端 + Node 后端 | Supabase PostgreSQL | Supabase Auth（Google/Apple OAuth） | 多端同步、个人云端账户 |
| **`local-only`** | 纯前端 SPA | 浏览器 localStorage + IndexedDB | 无 | 零依赖、隐私优先、静态托管 |

线上 demo 跑的是 **`local-only`**，零后端、单页面、Cloudflare Pages 直接托管 dist 即可。

---

## 技术栈

- **框架**：Vue 3 (Composition API + `<script setup>`)
- **构建**：Vite 6
- **样式**：Tailwind CSS + CSS Variables（暗/亮主题）
- **Markdown**：marked + KaTeX + highlight.js
- **AI**：DeepSeek Chat Completions API
- **本地存储**（`local-only`）：localStorage（threads/path）+ IndexedDB via [`idb`](https://github.com/jakearchibald/idb)（concept 内容）
- **后端**（`main`）：Hono + Drizzle ORM + Supabase（PostgreSQL + Auth）

---

## 本地开发

```bash
git clone git@github.com:LevenWin/DeepDive.git
cd DeepDive
npm install
npm run dev
```

默认 [http://localhost:5173](http://localhost:5173) （被占就跳 5174）。

### `main` 分支额外要求

需要同时运行 `/server`（在仓库外，见架构文档），并配 Supabase 项目；详见 [PLAN_v2.md](./PLAN_v2.md)。

---

## 文档

- [`app.md`](./app.md) — 最初 MVP 需求文档
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — 当前架构规范（布局、主题、System Prompt、数据流）
- [`PLAN_v2.md`](./PLAN_v2.md) — v2 重构计划（后端化 + Auth + 分类）

---

## License

MIT
