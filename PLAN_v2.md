# DeepDive v2 — 重构计划

## 一、总览

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌───────────────┐
│  Vue 3 前端   │────▶│  Node.js 后端    │────▶│   Supabase   │────▶│ DeepSeek API  │
│  (Vite SPA)  │◀────│  (Express/Fastify)│◀────│ (PG + Auth)  │     │ (AI 回答)     │
└──────────────┘     └─────────────────┘     └──────────────┘     └───────────────┘
       │                      │                      │
   静态资源              业务逻辑层              PostgreSQL
   OAuth 跳转            API Key 管理            用户表/线程表
                         智能高亮处理            概念表/分类表
```

**核心变化**：
- 前端从 localStorage → 全部数据走后端 API
- 后端统一管理 DeepSeek API 调用、数据库读写、Auth 验证
- Supabase 负责 Auth（Google/Apple OAuth）+ PostgreSQL 数据存储 + Row Level Security

---

## 二、数据库设计 (Supabase PostgreSQL)

### 表结构

```sql
-- 用户表 (由 Supabase Auth 自动创建 auth.users，用其 id 作外键)
-- 扩展用户 profile
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 分类表
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#10a37f',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 线程表 (一次探索 = 一个 thread)
CREATE TABLE threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  root_title    TEXT NOT NULL,
  root_slug     TEXT NOT NULL,
  current_slug  TEXT NOT NULL,
  is_favorite   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 概念表 (线程中的单个概念节点)
CREATE TABLE concepts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  content           TEXT DEFAULT '',
  summary           TEXT DEFAULT '',
  difficulty        TEXT DEFAULT '通俗',
  parent_slug       TEXT,          -- 父节点 slug，null = 根节点
  position          INT DEFAULT 0, -- 同层排序
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, slug)
);

-- 关联概念表 (概念的 related_concepts，供高亮使用)
CREATE TABLE related_concepts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id        UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  term              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  summary           TEXT DEFAULT '',
  position          INT DEFAULT 0
);

-- 索引
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_category_id ON threads(category_id);
CREATE INDEX idx_concepts_thread_id ON concepts(thread_id);
CREATE INDEX idx_related_concepts_concept_id ON related_concepts(concept_id);
```

### Row Level Security (RLS)

```sql
-- 所有用户数据表启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_concepts ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能读写自己的数据
CREATE POLICY "own_data" ON profiles     FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_data" ON categories   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON threads      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON concepts     FOR ALL USING (
  thread_id IN (SELECT id FROM threads WHERE user_id = auth.uid())
);
CREATE POLICY "own_data" ON related_concepts FOR ALL USING (
  concept_id IN (
    SELECT c.id FROM concepts c
    JOIN threads t ON c.thread_id = t.id
    WHERE t.user_id = auth.uid()
  )
);
```

---

## 三、Node.js 后端设计

### 技术选型

| 层 | 选择 | 原因 |
|----|------|------|
| 运行时 | Node.js 20+ (ESM) | 与前端统一语言 |
| 框架 | **Hono** | 轻量、TypeScript 友好、边缘部署就绪 |
| ORM | **Drizzle ORM** | 类型安全、SQL-like、与 Supabase PG 完美配合 |
| Auth | Supabase Auth Helpers | 验证 JWT、注入 `req.userId` |
| API Key 管理 | 后端环境变量 `DEEPSEEK_API_KEY` | 不再暴露给前端 |
| 部署 | Cloudflare Workers / Fly.io / Railway | 边缘或轻量容器 |

### 目录结构

```
server/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts                  # 入口，Hono 实例
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema 定义
│   │   ├── migrations/           # Drizzle 迁移文件
│   │   └── client.ts             # Supabase PG 连接
│   ├── middleware/
│   │   └── auth.ts               # JWT 验证中间件
│   ├── routes/
│   │   ├── auth.ts               # /api/auth/* (用户信息)
│   │   ├── categories.ts         # /api/categories CRUD
│   │   ├── threads.ts            # /api/threads CRUD
│   │   ├── concepts.ts           # /api/concepts CRUD
│   │   └── ai.ts                 # /api/ai/fetch-concept (DeepSeek 代理)
│   ├── services/
│   │   ├── deepseek.ts           # DeepSeek API 调用封装
│   │   └── highlight.ts          # 智能高亮处理服务
│   └── utils/
│       └── slug.ts               # Slug 生成
```

### API 路由设计

| 方法 | 路径 | 说明 | Auth |
|------|------|------|------|
| `GET` | `/api/auth/me` | 获取当前用户 profile | ✅ |
| `PUT` | `/api/auth/me` | 更新用户 profile | ✅ |
| `GET` | `/api/categories` | 获取分类列表 | ✅ |
| `POST` | `/api/categories` | 创建分类 | ✅ |
| `PUT` | `/api/categories/:id` | 编辑分类 | ✅ |
| `DELETE` | `/api/categories/:id` | 删除分类 | ✅ |
| `GET` | `/api/threads` | 获取线程列表(支持 ?category_id=) | ✅ |
| `GET` | `/api/threads/:id` | 获取单个线程(含概念树) | ✅ |
| `POST` | `/api/threads` | 创建线程 | ✅ |
| `PATCH` | `/api/threads/:id` | 更新线程(category/favorite/title) | ✅ |
| `DELETE` | `/api/threads/:id` | 删除线程(级联删概念) | ✅ |
| `GET` | `/api/threads/:id/concepts` | 获取线程所有概念 | ✅ |
| `POST` | `/api/threads/:id/concepts` | 创建概念 | ✅ |
| `PUT` | `/api/concepts/:id` | 更新概念 | ✅ |
| `POST` | `/api/ai/fetch-concept` | 调用 DeepSeek，创建概念+关联 | ✅ |

### 核心业务逻辑

```
POST /api/ai/fetch-concept
  Body: { conceptName, parentSlug?, threadId? }

后端处理流程：
  1. 验证 JWT → userId
  2. 如果 threadId 不存在 → 创建新 thread
  3. 如果 parentSlug 存在 → 查询父概念 summary → 注入 System Prompt
  4. 调用 DeepSeek API（API Key 在服务端，不暴露给前端）
  5. 解析响应 → 写入 concepts 表 + related_concepts 表
  6. 返回 { concept, relatedConcepts }
```

---

## 四、Google / Apple 登录

### Supabase Auth 配置

```
1. Supabase Dashboard → Authentication → Providers
2. 启用 Google：
   - Google Cloud Console → OAuth 2.0 Client ID
   - 填入 Client ID + Secret
   - Authorized redirect URI: https://<project>.supabase.co/auth/v1/callback
3. 启用 Apple：
   - Apple Developer → Services IDs → Sign In with Apple
   - 填入 Client ID + Key ID + Team ID + Private Key
```

### 前端流程

```ts
// src/composables/useAuth.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' }
  })
}

async function signInWithApple() {
  await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin + '/auth/callback' }
  })
}

// 监听 auth 状态
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // 存储 session.access_token，后续 API 请求带 Authorization: Bearer <token>
  }
})
```

### UI 位置

- 首页右上角新增「登录」按钮
- 点击弹出 Google / Apple 选择
- 登录后显示头像 + 用户名
- 未登录可用（数据存 localStorage），登录后同步到后端

---

## 五、智能高亮优化

### 问题分析

当前高亮依赖 AI 返回的 `relatedConcepts`，问题是：
- AI 不一定把所有可深入的概念都放进 `relatedConcepts`
- 每个概念的正文中也提到很多相关术语，但没被标记

### 方案：后端术语提取 + 前端渲染

```
POST /api/ai/fetch-concept 返回后，后端额外执行：

1. Term Extraction
   └─ 从 AI 返回的 Markdown content 中提取 **加粗术语** 和 `行内代码`
   └─ 从 relatedConcepts 中收集所有 term
   └─ 合并去重，每个 term 自动生成 slug
   └─ 存入 related_concepts 表 (is_extracted: true)

2. 前端渲染时
   └─ markdown.js 的 highlightConcepts 遍历所有 related_concepts
   └─ 在正文中查找并高亮，不需要 AI 显式标注
```

### 高亮规则

```js
// 术语来源（优先级从高到低）
const highlightSources = [
  // 1. AI 显式返回的子概念 (已有)
  ...result.relatedConcepts,

  // 2. Markdown 中 **加粗** 的术语 (后端提取)
  ...extractBoldTerms(result.content),

  // 3. 用户当前线程中已有的概念标题 (跨概念关联)
  ...getSiblingConceptTerms(threadId),
]

// 去重 + slug 自动生成
// 过滤排除：常见停用词、纯数字、已高亮过的短语
```

### 效果示例

```
正文内容：
  **机器学习**是人工智能的一个分支。**监督学习**需要标注数据，
  而**无监督学习**直接从未标记数据中发现模式。

AI 返回 relatedConcepts: [监督学习, 深度学习]

优化后高亮：
  [机器学习](可点击) 是人工智能的一个分支。
  [监督学习](可点击 → AI 已返回) 需要标注数据，
  而 [无监督学习](可点击 → 从加粗提取) 直接从未标记数据中发现模式。
  [人工智能](可点击 → 从加粗提取)
```

---

## 六、历史记录分类

### 数据模型 (已有 categories 表)

```
categories
  id          UUID
  user_id     UUID (FK → auth.users)
  name        TEXT (如 "计算机科学", "哲学", "数学")
  color       TEXT (分类标签颜色)
  sort_order  INT

threads
  category_id UUID (FK → categories, nullable)
```

### API 已覆盖

| 操作 | 接口 |
|------|------|
| 创建分类 | `POST /api/categories` |
| 重命名分类 | `PUT /api/categories/:id` |
| 删除分类 | `DELETE /api/categories/:id` |
| 线程归类 | `PATCH /api/threads/:id { category_id }` |
| 按分类筛选 | `GET /api/threads?category_id=xxx` |

### UI 设计

```
┌──────────────────────────────────┐
│ 📚 历史探索                      │
├──────────────────────────────────┤
│ 🏷 分类                          │
│ ┌──────────┐ ┌──────────┐       │
│ │ 计算机科学 │ │ 哲学     │ + 新建 │  ← 分类标签行，点击筛选
│ └──────────┘ └──────────┘       │
├──────────────────────────────────┤
│ 🔍 机器学习        计算机科学    │  ← 线程行显示分类名
│ 🔍 Kafka           计算机科学    │
│ 🔍 量子计算         物理学       │
│ ...                              │
├──────────────────────────────────┤
│ + 新建分类                       │  ← 底部操作
└──────────────────────────────────┘
```

### HistoryPanel 改造点

1. 顶部新增分类标签栏，水平滚动
2. 线程卡片右上角显示分类标签（可下拉更改）
3. 左滑或长按出现「编辑分类」/「重命名」菜单
4. 分类管理弹窗：创建、重命名、删除、排序

---

## 七、实施步骤

### Phase 1: 基础设施 (3-4 天)

| 步骤 | 内容 |
|------|------|
| 1.1 | 创建 Supabase 项目，配置 Google/Apple OAuth |
| 1.2 | 初始化 `/server` 目录，Hono + Drizzle + TypeScript |
| 1.3 | 定义 Drizzle schema，生成迁移，部署到 Supabase PG |
| 1.4 | 实现 JWT auth 中间件 |
| 1.5 | 前端新增 `useAuth` composable |

### Phase 2: API & 数据迁移 (3-4 天)

| 步骤 | 内容 |
|------|------|
| 2.1 | 实现 categories CRUD 路由 |
| 2.2 | 实现 threads CRUD 路由 |
| 2.3 | 实现 concepts + related_concepts 路由 |
| 2.4 | 实现 `/api/ai/fetch-concept`（DeepSeek 代理） |
| 2.5 | 前端改造：`useThread.js` → 走后端 API |

### Phase 3: 智能高亮 (1-2 天)

| 步骤 | 内容 |
|------|------|
| 3.1 | 后端术语提取服务 (加粗/代码/标题) |
| 3.2 | 前端 `markdown.js` 高亮逻辑优化 |
| 3.3 | 点击高亮术语 → 调 API 创建子概念 |

### Phase 4: UI 改造 (2-3 天)

| 步骤 | 内容 |
|------|------|
| 4.1 | 首页新增登录入口 |
| 4.2 | HistoryPanel 加入分类管理 |
| 4.3 | 线程卡片支持编辑/重命名/移动分类 |
| 4.4 | 分类管理弹窗 |

### Phase 5: 测试 & 部署 (1-2 天)

| 步骤 | 内容 |
|------|------|
| 5.1 | 后端单元测试 + 集成测试 |
| 5.2 | 前端 E2E 测试 |
| 5.3 | 部署后端到 Railway/Fly.io |
| 5.4 | 部署前端到 Vercel/Netlify |

---

## 八、关键决策记录

| 决策 | 原因 |
|------|------|
| API Key 移到后端 | 安全性：前端不再持有 DeepSeek Key |
| 数据全部走后端 | 统一数据源、支持多端同步、RLS 保护 |
| 使用 Supabase Auth | 开箱即用的 OAuth + JWT，无需自建认证系统 |
| 智能高亮在服务端 | 提取逻辑可迭代，不增加前端体积 |
| Drizzle ORM | 类型安全、轻量、方便迁移 |
| Hono 框架 | 边缘部署就绪、类 Express API、性能优秀 |
