# DeepDive v3 — 考核卡片 (Quiz) 方案 (纯本地存储版)

## 一、需求概述

在每个问题下新增考核卡片：
- 考核内容关联分类（Category），分类支持树形父子层级
- 支持选择范围：**仅该分类** / **该分类及其所有子孙分类**
- 用户可点击选项作答、查看解析
- 支持 AI 自动生成题目
- **所有数据存 localStorage，不需后端**

---

## 二、数据模型 (localStorage)

### 2.1 categories (分类树)

存入 localStorage key `deepdive-categories`：

```js
[
  {
    id: "cat_001",
    name: "计算机科学",
    parentId: null,        // null = 根分类
    color: "#10a37f",
    sortOrder: 0,
    createdAt: 1234567890,
  },
  {
    id: "cat_002",
    name: "数据结构",
    parentId: "cat_001",   // 子分类
    color: "#3776ab",
    sortOrder: 0,
    createdAt: 1234567890,
  },
]
```

### 2.2 thread.categories (线程关联分类)

线程本身不需要 category 字段——quiz 题目直接引用分类 ID。

### 2.3 thread.quizzes (考核数据存线程内)

每个 thread 对象新增 `quizzes` 字段：

```js
thread = {
  threadId: "t_xxx",
  concepts: { ... },
  tree: { ... },
  quizzes: [
    {
      id: "qz_001",
      conceptSlug: "binary-search",     // 关联的概念 slug
      categoryId: "cat_002",            // 关联的分类 ID
      scope: "descendants",             // "direct" | "descendants"
      question: "二分查找的时间复杂度是？",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      correctIndex: 1,
      explanation: "二分查找每次将搜索范围减半，因此时间复杂度为 O(log n)。",
      difficulty: "easy",
      userAnswer: null,                 // null = 未作答, 0-3 = 选择的索引
      createdAt: 1234567890,
    },
  ],
}
```

**设计决策**：quizzes 存线程内而非独立 key。优势：
- 删除线程时 quizzes 自动清除
- 切换线程时 quizzes 自动随线程加载
- 不用维护额外的同步逻辑

---

## 三、useQuiz Composable

```
src/composables/useQuiz.js

功能：
  - 读取/创建/编辑/删除分类 (categories localStorage)
  - 读取/创建/删除/作答 quizzes (存在 activeThread.quizzes)
  - 获取子孙分类 ID 列表 (getDescendantCategoryIds)
  - AI 生成题目 (调用 useDeepSeek)
  - 筛选题目 (按 categoryId + scope)

API:
  // 分类管理
  getCategories()              → 返回所有分类列表
  createCategory(name, parentId, color) → 创建分类
  updateCategory(id, updates)  → 更新分类
  deleteCategory(id)           → 删除分类（子分类 parentId 置 null）
  getCategoryTree()            → 树形结构 [{...children: [...]}]
  getDescendantCategoryIds(id) → 递归获取子孙分类 ID 列表

  // 题目管理
  getQuizzes(conceptSlug)     → 获取当前概念下的题目
  getAllThreadQuizzes()       → 获取当前线程所有题目
  addQuiz(quizData)           → 添加题目
  updateQuiz(id, updates)     → 更新题目
  deleteQuiz(id)              → 删除题目
  answerQuiz(id, index)       → 作答

  // AI 生成
  generateQuizzes(conceptSlug, categoryId, scope, count) → 调 AI 生成

  // 筛选
  getFilteredQuizzes(conceptSlug, categoryId, scope)
    → 按分类+范围筛选题目
```

---

## 四、组件设计

### QuizCard.vue (容器)
```
Props:
  - conceptSlug: string
  - categories: Array
Events:
  - @quiz-click({slug, term})
Slots: 无

Template:
  📝 知识考核
  [分类筛选 + 范围切换]           ← QuizCategoryFilter
  [AI 生成题目] 按钮               ← 弹出配置弹窗
  题目列表                          ← QuizItem * N
  空态提示 (无题目)                 ← 显示提示文字
```

### QuizCategoryFilter.vue (筛选器)
```
Props:
  - categories: Array
  - modelValue: { categoryId, scope }
Events:
  - @update:modelValue

Template:
  两个下拉选择器并列：
  - 分类选择 (支持树形缩进显示)
  - 范围选择 (仅该分类 / 包含所有子孙)
```

### QuizItem.vue (单题)
```
Props:
  - quiz: Object
Events:
  - @answer(quizId, index)

States:
  - 未作答：选项可点击，显示「提交」按钮
  - 已作答正确：绿色边框 + ✅ 正确 + 解析
  - 已作答错误：红色边框 + ❌ 错误 + 显示正确答案 + 解析
  - 已查看答案(无提交)：直接显示正确答案 + 解析

Template:
  N. 题目文字
  ○/● 选项 A
  ○/● 选项 B
  ...
  [提交] 或 结果展示 + 解析
```

### QuizGenerateModal.vue (生成配置弹窗)
```
Props:
  - categories: Array
  - visible: Boolean
Events:
  - @close
  - @generate({ categoryId, scope, count })

Template:
  弹窗内：
  - 标题：「AI 生成考核题」
  - 分类选择
  - 范围选择
  - 题目数量：3 / 5 / 10
  - [生成] 按钮
  - 生成中 loading 态
```

---

## 五、AI 生成逻辑

### Prompt 模板

```
你是一位知识考核专家。请基于以下概念内容，生成 {count} 道选择题。

要求：
- 每道题 4 个选项，只有一个正确答案
- 难度为中等，考察对概念的核心理解
- 附带简短解析
- 不要重复相似题目

概念内容：
{concept.content}

输出格式（严格遵守）：
---QUIZZES---
[
  {
    "question": "题目",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "解析"
  }
]
```

### 调用流程

```
用户点击「AI 生成」
  → 弹出 QuizGenerateModal
  → 选择分类、范围、数量
  → 调用 useDeepSeek.fetchQuizGenerate(conceptName, content, count)
  → 构建 prompt，调 DeepSeek API
  → 解析 ---QUIZZES--- 分隔符后的 JSON
  → 写入 quizzes 数组
  → 保存 localStorage
  → 刷新列表
```

---

## 六、文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/composables/useQuiz.js` | 考核状态管理 + 分类管理 |
| `src/components/QuizCard.vue` | 考核卡片容器 |
| `src/components/QuizCategoryFilter.vue` | 分类范围筛选器 |
| `src/components/QuizItem.vue` | 单道题目渲染 |
| `src/components/QuizGenerateModal.vue` | AI 生成配置弹窗 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/composables/useDeepSeek.js` | 新增 `fetchQuizGenerate` 方法 |
| `src/composables/useThread.js` | thread 对象加 `quizzes: []` 字段 |
| `src/components/ContentView.vue` | 底部加入 `<QuizCard>` |
| `src/components/ConceptPage.vue` | 传递 categories/quizzes/saveThreads 给 ContentView |

---

## 七、交互流程

### 作答流程

```
1. 用户阅读题目
2. 点击选项 → 选项高亮
3. 点击「提交」→ 判断对错
4. 正确 → 绿色边框 + ✅ + 解析
5. 错误 → 红色边框 + ❌ + 正确选项高亮 + 解析
6. userAnswer 存入 quiz 对象 → saveThreads()
```

### AI 生成流程

```
1. 点击「AI 生成题目」→ 弹窗
2. 选择分类 + 范围 + 数量
3. 点击「生成」→ loading 态
4. 后端调用 DeepSeek ({concept.content} + prompt)
5. 解析返回的 JSON
6. 写入 quizzes 数组
7. saveThreads()
8. 关闭弹窗，刷新列表
```

### 分类管理流程

```
1. QuizCategoryFilter 下拉显示所有分类（树形缩进）
2. 底部「管理分类」按钮 → 弹出分类管理弹窗
3. 弹窗内：列表 + 新建/重命名/删除/移动父子
4. 操作后 saveCategories() → 刷新
```
