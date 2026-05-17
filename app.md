下面是一份完整的 **ConceptDeepDive — AI 深度知识探索 Web** 整体需求与技术方案（MVP 版），可直接用于指导开发。

---

# ConceptDeepDive-MVP 整体需求与技术方案

---

## 1. 项目概述

一个由 DeepSeek 驱动的纯前端知识探索工具。用户输入任意概念，AI 生成详细解释，解释中的关键子概念自动高亮为链接，点击即可无限深入，同时完整保留学习路径与历史，所有数据均保存在用户浏览器本地，无需注册登录。

**核心价值**：  
- 打破线性学习，实现“概念互联”的自由钻取  
- 有上下文记忆：子概念解释会关联父辈知识  
- 零成本、零依赖，打开即用

---

## 2. MVP 功能范围

### 2.1 核心功能（必须实现）

- **概念搜索入口**：输入主题，一键开始探索
- **三栏布局**（桌面端）  
  - 左侧：学习路径树  
  - 中间：AI 生成的 Markdown 解释正文，高亮概念可点击  
  - 右侧：当前概念的关联子概念标签
- **无限跳转**：点击高亮概念进入新概念页面，路径树同步更新
- **难度调节**：通俗 ↔ 学术滑块，调整后重新生成当前概念
- **本地缓存**：所有概念存储在 IndexedDB，路径与设置存 localStorage
- **DeepSeek API 集成**：用户提供 API Key（本地保存），带父辈上下文生成解释
- **移动端适配**：小屏时左右栏变为可滑出的抽屉

### 2.2 非 MVP 功能（暂不实现）

- 多卡片并行查看
- 知识图谱可视化
- 笔记、闪卡、回溯总结
- 用户系统与云同步

---

## 3. UI 设计要点

**主题**：强制深色模式，OpenAI 风格配色  
- 背景：`#1a1a1a`  
- 卡片/侧栏：`#2d2d2d`  
- 文字：`#ececec`  
- 强调绿：`#10a37f`  
- 概念链接：绿色下划线，悬停发光  
- 圆角：`rounded-xl`，阴影：`shadow-lg`

**布局**（桌面 ≥ 768px）：
```
┌──────────┬────────────────────┬──────────┐
│ 路径树   │  AI正文 + 高亮      │ 关联概念  │
│ (320px)  │       (flex-1)     │ (300px)  │
└──────────┴────────────────────┴──────────┘
```
移动端：全屏卡片 + 顶部下拉面板。

---

## 4. 技术栈选择（MVP 纯前端）

| 层次 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建 | Vite |
| CSS | Tailwind CSS (CDN) |
| Markdown 渲染 | marked.js (CDN) |
| 本地数据库 | IndexedDB (通过 idb 库封装) |
| AI SDK | 原生 fetch 调用 DeepSeek API |
| 部署 | 静态 HTML/JS 文件，可直接用 GitHub Pages / Vercel 托管 |

**无任何后端依赖，无数据库服务端，无 Node.js 服务器**。

---

## 5. 数据存储设计

### 5.1 IndexedDB 方案

- 数据库名：`concept-deep-dive`  
- 对象仓库：`concepts`  
- 主键：`slug`（概念名称的 URL 友好标识，由前端生成）

**存储对象结构**：
```typescript
interface StoredConcept {
  slug: string;          // "kafka"
  title: string;         // "Kafka"
  content: string;       // Markdown 正文
  relatedConcepts: Array<{
    term: string;        // "Broker"
    slug: string;        // "broker"
    summary: string;     // "消息存储转发节点"
  }>;
  difficulty: string;    // "通俗" | "学术"
  createdAt: number;     // 时间戳
}
```

### 5.2 localStorage 方案

- `learningPath`: JSON 数组 `[{slug, title}]`，记录根到当前的完整路径  
- `apiKey`: 用户输入的 DeepSeek API Key（加密存储可选）  
- `difficulty`: 当前默认难度 `"通俗"` 或 `"学术"`  
- `lastActiveSlug`: 最后一次浏览的概念 slug，用于刷新恢复

---

## 6. AI 交互设计 (DeepSeek)

### 6.1 请求构建

**接口地址**：`https://api.deepseek.com/chat/completions`  
**模型**：`deepseek-chat`  
**鉴权**：`Bearer {apiKey}`（从 localStorage 读取）

**构建 Prompt 的方法**：

1. 从 localStorage 读取 `learningPath`，拼接为字符串：  
   `机器学习 → 监督学习 → 支持向量机`（如无可留空）

2. System Prompt（动态部分见 `{learningPath}` 与 `{difficulty}`）：
   ```
   你是一个知识渊博的导师。用户正在学习一系列相互关联的概念，学习路径为：
   {learningPath}

   现在请为用户给出的概念生成详细解释。要求：
   1. 用 Markdown 格式，语言清晰，难度适配（{difficulty}）。
   2. 解释时，请自然地联系学习路径中的父概念，说明当前概念与它们的关联，以及它在该知识体系中的位置。
   3. 提取出解释中出现的关键子概念（必须理解的下位概念），以一个严格 JSON 数组列出，放在正文之后，用“---CONCEPTS---”分隔。
      JSON 格式：[{"term": "概念名", "slug": "url-slug", "summary": "一句话简介"}]
   确保 JSON 可解析，且 slug 仅包含小写字母、数字和连字符。
   ```

3. User Prompt：
   ```
   概念：{conceptName}
   ```

4. 请求体示例：
   ```json
   {
     "model": "deepseek-chat",
     "messages": [
       { "role": "system", "content": "(System Prompt如上)" },
       { "role": "user", "content": "概念：核函数" }
     ],
     "stream": false
   }
   ```

### 6.2 响应解析

- 提取 `choices[0].message.content`
- 以 `---CONCEPTS---` 为分隔符，前半部分为正文，后半部分为 JSON 数组字符串
- 对 JSON 数组进行清理（去除可能的 Markdown 代码块标记），然后 `JSON.parse()`
- 对每个概念项，用前端定义的 `generateSlug()` 函数**覆盖**或补全 `slug`，确保本地存储主键一致性

### 6.3 缓存策略

点击子概念 → 生成 slug → 查询 IndexedDB  
- 缓存命中：直接渲染，无需调用 API  
- 未命中：调用 API，生成后存入 IndexedDB，再渲染

---

## 7. 核心功能流程

### 7.1 概念生成流程

```
[输入概念]
    ↓
检查 IndexedDB(slug)
    ├─ 存在 ──→ 加载本地数据，渲染页面
    └─ 不存在
         ↓
     调用 DeepSeek (携带父路径)
         ↓
     解析正文与子概念列表
         ↓
     存入 IndexedDB
         ↓
     渲染页面，更新学习路径到 localStorage
```

### 7.2 概念跳转与路径管理

- 主区中高亮的子概念链接绑定点击事件
- 点击时获得 `targetSlug` 和 `targetTitle`
- 更新 `learningPath`：
  - 若点击的 slug 已处于路径数组某位置（回溯），则截断该位置之后的节点
  - 否则，追加到路径末尾
- 保存路径到 localStorage，然后调用概念加载流程
- 左侧路径树根据路径数组渲染，当前节点高亮为绿色，每个节点可点击回溯

### 7.3 难度调节

- 概念页面底部有滑块，修改当前难度
- 点击“重新生成”时，**忽略本地缓存**，直接调用 API 重新生成，并覆盖 IndexedDB 中该 slug 的数据（或另存为带难度后缀的 key，这样不同难度独立缓存）
- 建议 MVP 采用覆盖策略，简单易用

### 7.4 恢复与重置

- 应用启动时，检查 `lastActiveSlug`，如存在且路径数组有效，自动定位到上次概念
- “新探索”按钮清空路径数组、`lastActiveSlug`，回到首页

---

## 8. 项目结构与核心代码模块（建议）

```
/
├── index.html
├── main.js            # Vue 应用入口
├── App.vue            # 根组件，布局切换
├── components/
│   ├── SearchBar.vue
│   ├── ConceptPage.vue      # 核心三栏页面
│   ├── PathTree.vue         # 左栏学习路径树
│   ├── ContentView.vue      # 中栏 AI 正文渲染（包含高亮处理）
│   ├── RelatedConcepts.vue  # 右栏子概念标签
│   └── ApiKeyModal.vue      # API Key 设置弹窗
├── composables/
│   ├── useDeepSeek.js       # API 调用与 prompt 构建
│   ├── useLocalDB.js        # IndexedDB 操作封装
│   └── usePath.js           # 学习路径状态管理
├── utils/
│   ├── slug.js              # slug 生成
│   └── markdown.js          # Markdown 渲染 + 高亮替换
└── style.css                # Tailwind 引入及自定义样式
```

---

## 9. 部署与运行

1. 用户在本地打开 `index.html` 即可运行（需浏览器支持 ES Module）  
2. 若使用 Vite 构建，运行 `npm run dev` 启动开发服务器  
3. 生产构建：`npm run build`，生成静态文件，可直接部署到任何静态托管（Vercel、Netlify, GitHub Pages）  
4. 用户需自备 DeepSeek API Key，首次使用会自动弹出设置框

---

## 10. 未来可扩展方向（非 MVP）

- 多卡片并行：允许多个概念页并排显示  
- 知识图谱：D3.js 可视化概念网络  
- 笔记与闪卡：辅助记忆  
- 云端同步：引入用户系统和后端存储  
- 社区概念共享：允许用户分享自己的概念地图  

---

该方案完整覆盖了 MVP 所需的产品逻辑、UI/交互、数据存储与 AI 实现细节，可直接作为开发蓝图使用。