# DeepDive — 架构与设计规范

## 项目概览

AI 驱动的深度知识探索工具，基于 DeepSeek Chat API，支持树形知识路径导航。

### 技术栈

- **框架**: Vue 3 (Composition API + `<script setup>`)
- **构建**: Vite 6
- **样式**: Tailwind CSS + CSS Variables
- **存储**: IndexedDB (idb 库) + localStorage
- **Markdown**: marked + KaTeX
- **API**: DeepSeek Chat Completions

---

## 文件清单

```
src/
├── App.vue                         # 根组件：首页/概念页路由切换
├── main.js                         # 入口
├── style.css                       # 全局样式 & CSS Variables & Markdown 样式
│
├── components/
│   ├── ConceptPage.vue             # 概念页主容器 (~470行)
│   ├── ContentView.vue             # Markdown 内容渲染 + 加载态 + 关联概念
│   ├── ContextMenu.vue             # 文字选择后弹出深入探索按钮
│   ├── PathTree.vue                # 左侧探索路径树
│   ├── RelatedConcepts.vue         # 关联子概念卡片列表
│   ├── SearchBar.vue               # 首页搜索框 (textarea 自适应)
│   ├── HistoryPanel.vue            # 历史记录面板
│   ├── ActionBar.vue               # 底部操作栏（难度/重新生成/复制）
│   ├── ApiKeyModal.vue             # API Key 设置弹窗
│   └── ToastContainer.vue          # 全局 toast 消息
│
├── composables/
│   ├── useDeepSeek.js              # DeepSeek API 调用 + System Prompt + 摘要提取
│   ├── useThread.js                # 线程 & 树状态管理 + treeVersion 刷新
│   ├── useLocalDB.js               # IndexedDB 持久化 (idb)
│   ├── useToast.js                 # Toast 通知系统
│   ├── useTheme.js                 # 暗色/亮色主题切换
│   ├── usePath.js                  # 学习路径管理
│   └── useSearchEvent.js           # 跨组件搜索事件桥
│
└── utils/
    ├── markdown.js                 # Markdown 渲染 + 概念高亮 + 代码/表格增强
    └── slug.js                     # URL 友好 Slug 生成 (中文 fallback)
```

---

## 布局架构

### 首页

```
┌──────────────────────────────────────────────────┐
│                                          ☀️/🌙   │  固定右上角主题切换
│                                                  │
│              ConceptDeepDive                      │  标题 (5xl font)
│           AI 驱动的深度知识探索工具                │
│          由 DeepSeek 提供智能支持                  │
│                                                  │
│   ┌──────────────────────────────────────┐       │
│   │  textarea 自适应换行                  │ 探索  │  max-w-2xl 居中
│   └──────────────────────────────────────┘       │
│                                                  │
│   🟢 API Key  更换    📚 历史探索 (7)             │  状态指示 + 操作
└──────────────────────────────────────────────────┘
```

### 概念页 (三栏)

```
┌────────┬───────────────────────────────────────┬──────────┐
│        │  DeepDive  探索主题                    │ ☀️ 史 新 │  header
│        ├───────────────────────────────────────┴──────────┤
│ 📍 探索 │                                                  │
│ 路径    │         AI 生成主体内容                            │
│        │  ┌──────────────────────────────────┐            │
│ 🔍 A   │  │ 标题 + AI 生成                   │            │
│  ▸ B   │  │ ## 章节...                       │            │
│  ⟳ C   │  │ 正文...                          │            │
│        │  │ > 引用...                        │            │
│  280px │  ├──────────────────────────────────┤            │
│        │  │ [复制] [重新生成]                │            │
│        │  ├──────────────────────────────────┤            │
│        │  │ 🔗 关联概念 ▸ 卡片 ▸ 卡片        │            │
│        │  └──────────────────────────────────┘            │
│        │                              flex-1              │
├────────┴──────────────────────────────────────────────────┤
│                    历史面板 (v-if 展开)       280px         │
└───────────────────────────────────────────────────────────┘
```

| 区域 | 宽度 | 显示条件 |
|------|------|----------|
| 左侧 PathTree | 280px | 始终显示 (移动端 fixed) |
| 中间 ContentView | flex-1 | 始终显示 |
| 右侧历史面板 | 280px | `historyOpen === true` |

---

## 主题色系统

### 暗色模式 `data-theme="dark"` (默认)

| 变量 | 色值 | 用途 |
|------|------|------|
| `--color-bg` | `#1a1a1a` | 页面/主内容区背景 |
| `--color-surface` | `#2d2d2d` | 卡片、侧栏、搜索框 |
| `--color-surface-hover` | `#3a3a3a` | 列表项/按钮悬停 |
| `--color-border` | `#3d3d3d` | 分割线、边框 |
| `--color-text` | `#ececec` | 主文字、标题 |
| `--color-text-secondary` | `#c0c0c0` | 正文、描述 |
| `--color-text-muted` | `#888` | 次要文字、placeholder |
| `--color-accent` | `#10a37f` | 强调色、链接、按钮 |
| `--color-accent-bg` | `rgba(16,163,127,0.12)` | 选中态/高亮背景 |
| `--color-bg-input` | `#1e1e1e` | 代码块标题栏、表格头 |
| `--color-code-bg` | `#121212` | 代码块主体 |
| `--color-table-hover` | `rgba(16,163,127,0.05)` | 表格行悬停 |

### 亮色模式 `data-theme="light"`

| 变量 | 色值 | 用途 |
|------|------|------|
| `--color-bg` | `#fafafa` | 页面/主内容区背景 |
| `--color-surface` | `#ffffff` | 卡片、侧栏、搜索框 |
| `--color-surface-hover` | `#f0f0f0` | 列表项/按钮悬停 |
| `--color-border` | `#e5e5e5` | 分割线、边框 |
| `--color-text` | `#1a1a1a` | 主文字、标题 |
| `--color-text-secondary` | `#555` | 正文、描述 |
| `--color-text-muted` | `#999` | 次要文字、placeholder |
| `--color-accent` | `#0d8c6d` | 强调色（白底略深） |
| `--color-accent-bg` | `rgba(13,140,109,0.08)` | 选中态/高亮背景 |
| `--color-bg-input` | `#f5f5f5` | 代码块标题栏、表格头 |
| `--color-code-bg` | `#f0f0f0` | 代码块主体 |
| `--color-table-hover` | `rgba(13,140,109,0.05)` | 表格行悬停 |

### 使用规范

所有组件通过 CSS Variable 引用，不硬编码色值：

```html
<div :class="'bg-[var(--color-surface)]'" />
<span :class="'text-[var(--color-text-secondary)]'" />
<button :class="'bg-[var(--color-accent)] text-white'" />
<a :class="'text-[var(--color-accent)]'" />
```

---

## 核心交互流程

### 数据流

```
首页搜索 → searchQuery → ConceptPage.handleNewSearch
  ├─ generateSlug → createThread → bumpTree() → 左侧树立即显示
  ├─ fetchConcept → DeepSeek API → parseResponse
  ├─ cacheConceptData → currentConcept = data → loading = false
  ├─ ContentView.renderedHtml → v-html 渲染
  └─ 关联概念显示在答案底部

点击子概念 → handleConceptClick
  ├─ addConceptToTree + navigateToSlug → bumpTree() → 左侧树立即更新
  ├─ loadConceptBySlug → API (携带父 summary) → 左侧旋转图标
  └─ 完成后更新内容 + unmarkLoading
```

### 加载与缓存

| 层级 | 策略 |
|------|------|
| 内存缓存 | 会话内首选，`thread.concepts[slug]` 直接命中 |
| IndexedDB | 冷启动一次性 `restoreFromIndexedDB` 批量恢复 |
| API | DeepSeek Chat，每请求带序号日志 `🔄 #N → ✅ #N` |

### System Prompt 完整设计

#### 调用方式

```
POST https://api.deepseek.com/chat/completions
Authorization: Bearer <apiKey>
Body: {
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },      // 下方完整 Prompt
    { role: 'user',   content: '概念：<概念名>'  }   // 用户输入仅此一行
  ],
  stream: false
}
```

#### 完整 System Prompt 模板

```
你是知识导师，擅长教学类概念深度讲解，输出适配 Markdown UI 渲染，
全程遵循统一排版与知识输出规范。

{父概念摘要块 — 仅在子概念请求时出现}

## 学习上下文
路径：{学习路径，如 机器学习 → 监督学习 → SVM}
讲解时自然关联知识路径中的父概念，纳入完整知识体系，不孤立解释单点内容。

## 行文与内容结构
开篇用一段话做整体阐释，直接给出核心定义与本质内涵，建立整体认知。
正文使用 ## 和 ### 划分层级框架。每个部分都要详细展开，知识点、分类、
步骤、特征用列表细致说明，每条讲透讲清。
必须举例说明，至少给出 2-3 个具体例子帮助理解抽象概念。
文末用引用块 > 补充延伸思考、易混概念辨析、常见学习误区或实际应用场景。

## 输出量要求
- 总字数必须在 800-2000 字之间，内容翔实、言之有物
- 宁可多写也不可敷衍，每个关键点都必须展开论证
- 避免空洞的概括和口号式表达

## 视觉排版规范
- **关键术语**加粗，`按钮/路径/配置名` 使用行内代码格式
- 横向对比、分类辨析必须使用带表头的 Markdown 表格
- 代码块必须标注对应语言，例如 ```python
- 数学公式采用 $...$ 行内格式或 $$...$$ 块级格式

## 子概念提取规则
正文结束后用「---CONCEPTS---」分隔，直接输出标准可解析 JSON 数组：
[{"term":"概念名","slug":"url-slug","summary":"一句话简介"}]

约束要求：
- 固定提取 3-6 个同领域核心子概念
- 子概念必须与主概念归属同一学科，禁止跨领域无关提取
- slug 仅使用小写字母、数字和连字符
- JSON 纯文本输出，不包裹代码块、不加多余注释
```

#### 父概念摘要注入

| 场景 | parentSummary | 效果 |
|------|--------------|------|
| 新建搜索 | 空字符串 `''` | 不注入父概念块 |
| 点击子概念 | 父概念的 `summary`（最多 300 字纯文本） | 在 System Prompt 开头注入 |

**注入块的格式**：
```
## 父概念摘要
{父概念内容的前 300 字纯文本，剔除 markdown 标记}

请基于上述父概念内容，自然衔接子概念的讲解，说明继承关系和差异。
```

**摘要提取逻辑** (`extractSummary(content)`):
1. 移除 `#` 标题标记
2. 移除 `**bold**` 加粗标记
3. 移除 `` `code` `` 行内代码
4. 合并多行为单行
5. 取前 300 字符

#### 响应解析

AI 响应格式：
```
{Markdown 正文内容}

---CONCEPTS---
[{"term":"监督学习","slug":"supervised-learning","summary":"从标注数据中学习映射函数"},...]
```

解析步骤：
1. 查找分隔符 `---CONCEPTS---`
2. 分隔符之前 → `content`（正文 Markdown）
3. 分隔符之后 → 清理 ` ```json ` / ` ``` ` 包裹 → `JSON.parse` → `relatedConcepts`
4. 对正文执行 `extractSummary(content)` → 生成 `summary` 字段，供下级子概念使用

返回结构：
```js
{
  title: "机器学习",
  slug: "ji-qi-xue-xi",
  content: "## 核心定义\n\n...",
  summary: "机器学习是人工智能的一个分支，通过算法让计算机从数据中...",
  relatedConcepts: [
    { term: "监督学习", slug: "supervised-learning", summary: "从标注数据中..." },
    ...
  ]
}
```

#### 请求日志

每条 API 请求打印两行：

```
🔄 [API #1] "机器学习" | parentSummary: 0chars | prompt: 2947chars
✅ [API #1] "机器学习" done in 8566ms | content: 3456chars | concepts: 4
```

| 字段 | 含义 |
|------|------|
| `#N` | 全局自增序号 |
| `parentSummary: Nchars` | 是否携带父概念上下文 |
| `prompt: Nchars` | System Prompt 总长度 |
| `done in Nms` | 本次请求耗时 |
| `content: Nchars` | AI 返回正文长度 |
| `concepts: N` | 提取到的子概念数量 |



---

## 关键设计决策

| 决策 | 原因 |
|------|------|
| `treeVersion` 计数器 | Vue computed 无法检测对象内部变更 |
| IndexedDB 不读热路径 | 写锁阻塞读事务，改为 2s 超时兜底 |
| `persistConceptAsync` fire-and-forget | 避免 IndexedDB 阻塞 UI 渲染 |
| slug 中文 fallback `id-{ts}-{rand}` | `\w` 正则不匹配中文，清洗后为空 |
| visited Set + depth ≤ 50 | 防止 PathTree renderTree 无限递归 |
