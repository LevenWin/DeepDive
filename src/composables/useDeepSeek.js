import { generateSlug } from '../utils/slug.js'

const API_URL = 'https://api.deepseek.com/chat/completions'
const FETCH_TIMEOUT_MS = 120000
let apiRequestSeq = 0

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}

function extractSummary(content) {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

function buildSystemPrompt(learningPath, parentSummary) {
  const pathStr = learningPath.length > 0
    ? learningPath.map((p) => p.title).join(' → ')
    : '（无前置概念）'

  const parentBlock = parentSummary
    ? `## 父概念摘要\n${parentSummary}\n\n请基于上述父概念内容，自然衔接子概念的讲解，说明继承关系和差异。\n`
    : ''

  return `你是知识导师，擅长教学类概念深度讲解，输出适配 Markdown UI 渲染，全程遵循统一排版与知识输出规范。

${parentBlock}## 学习上下文
路径：${pathStr}
讲解时自然关联知识路径中的父概念，纳入完整知识体系，不孤立解释单点内容。

## 行文与内容结构
开篇用一段话做整体阐释，直接给出核心定义与本质内涵，建立整体认知。
正文使用 ## 和 ### 划分层级框架。每个部分都要详细展开，知识点、分类、步骤、特征用列表细致说明，每条讲透讲清。
必须举例说明，至少给出 2-3 个具体例子帮助理解抽象概念。
文末用引用块 > 补充延伸思考、易混概念辨析、常见学习误区或实际应用场景。

## 输出量要求
- 总字数必须在 800-2000 字之间，内容翔实、言之有物
- 宁可多写也不可敷衍，每个关键点都必须展开论证
- 避免空洞的概括和口号式表达

## 视觉排版规范
- **关键术语**加粗，\`按钮/路径/配置名\` 使用行内代码格式
- 横向对比、分类辨析必须使用带表头的 Markdown 表格
- 代码块必须标注对应语言，例如 \`\`\`python
- 数学公式采用 $...$ 行内格式或 $$...$$ 块级格式

## 子概念提取规则
正文结束后用「---CONCEPTS---」分隔，直接输出标准可解析 JSON 数组：
[{"term":"概念名","slug":"url-slug","summary":"一句话简介"}]

约束要求：
- 固定提取 3-6 个同领域核心子概念
- 子概念必须与主概念归属同一学科，禁止跨领域无关提取
- slug 仅使用小写字母、数字和连字符
- JSON 纯文本输出，不包裹代码块、不加多余注释`
}

export function useDeepSeek() {
  function getApiKey() {
    return localStorage.getItem('apiKey') || ''
  }

  function setApiKey(key) {
    localStorage.setItem('apiKey', key)
  }

  function getDifficulty() {
    return localStorage.getItem('difficulty') || '通俗'
  }

  function setDifficulty(d) {
    localStorage.setItem('difficulty', d)
  }

  function getLearningPath() {
    try { return JSON.parse(localStorage.getItem('learningPath') || '[]') } catch { return [] }
  }

  async function fetchConcept(conceptName, options = {}) {
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('API_KEY_MISSING')

    const difficulty = options.difficulty || getDifficulty()
    const learningPath = getLearningPath()
    const parentSummary = options.parentSummary || ''
    const userPrompt = options.userPrompt || ''

    const systemPrompt = buildSystemPrompt(learningPath, parentSummary)
    const userContent = userPrompt
      ? `概念：${conceptName}\n\n用户补充说明：${userPrompt}`
      : `概念：${conceptName}`

    const seq = ++apiRequestSeq
    console.log(
      `🔄 [API #${seq}] "${conceptName}"` +
      ` | parentSummary: ${parentSummary.length}chars` +
      ` | userPrompt: ${userPrompt.length}chars` +
      ` | prompt: ${systemPrompt.length}chars`,
    )

    const t0 = performance.now()
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('API 返回数据异常：缺少 choices[0].message.content')

    const elapsed = (performance.now() - t0).toFixed(0)
    const result = parseResponse(content, conceptName)
    console.log(
      `✅ [API #${seq}] "${conceptName}" done in ${elapsed}ms` +
      ` | content: ${content.length}chars` +
      ` | concepts: ${result.relatedConcepts.length}`,
    )
    return result
  }

  function parseResponse(content, conceptName) {
    if (!content || typeof content !== 'string') {
      return { title: conceptName, slug: generateSlug(conceptName), content: '', summary: '', relatedConcepts: [] }
    }
    const separator = '---CONCEPTS---'
    const sepIndex = content.indexOf(separator)

    let markdown = content
    let relatedConcepts = []

    if (sepIndex !== -1) {
      markdown = content.slice(0, sepIndex).trim()
      let jsonStr = content.slice(sepIndex + separator.length).trim()
      jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      try {
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) relatedConcepts = parsed
      } catch (e) {
        console.warn('[API] parse concepts JSON failed:', e.message)
      }
    }

    relatedConcepts = relatedConcepts.map((c) => ({
      term: c.term,
      slug: c.slug || generateSlug(c.term),
      summary: c.summary || '',
    }))

    return {
      title: conceptName,
      slug: generateSlug(conceptName),
      content: markdown,
      summary: extractSummary(markdown),
      relatedConcepts,
    }
  }

  async function fetchQuizGenerate(conceptName, content, count = 5) {
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('API_KEY_MISSING')

    const systemPrompt = `你是一位知识考核专家。请基于提供的概念内容，生成 ${count} 道选择题。

要求：
- 每道题 4 个选项，只有一个正确答案
- 难度为中等，考察对概念的核心理解
- 附带简短解析
- 不要重复相似题目

输出格式（严格遵守，不要包裹代码块）：
---QUIZZES---
[{"question":"题目","options":["A","B","C","D"],"correctIndex":0,"explanation":"解析"}]`

    const seq = ++apiRequestSeq
    console.log(`🔄 [API #${seq}] "Quiz: ${conceptName}" (flash) | count: ${count} | prompt: ${systemPrompt.length}chars`)

    const t0 = performance.now()

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `概念：${conceptName}\n\n概念内容：\n${content.slice(0, 4000)}` },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const body = data?.choices?.[0]?.message?.content
    if (!body) throw new Error('API 返回数据异常')

    const elapsed = (performance.now() - t0).toFixed(0)

    const separator = '---QUIZZES---'
    const sepIndex = body.indexOf(separator)
    let quizzes = []

    if (sepIndex !== -1) {
      let jsonStr = body.slice(sepIndex + separator.length).trim()
      jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      try {
        quizzes = JSON.parse(jsonStr)
        if (!Array.isArray(quizzes)) quizzes = []
      } catch (e) {
        console.warn('[API] parse quizzes JSON failed:', e.message)
      }
    } else {
      try {
        const cleaned = body.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        quizzes = JSON.parse(cleaned)
        if (!Array.isArray(quizzes)) quizzes = []
      } catch (e) {
        console.warn('[API] fallback parse quizzes failed')
      }
    }

    console.log(`✅ [API #${seq}] "Quiz: ${conceptName}" done in ${elapsed}ms | questions: ${quizzes.length}`)

    return quizzes.map((q) => ({
      question: q.question || '',
      options: q.options || ['', '', '', ''],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || '',
      difficulty: 'medium',
    }))
  }

  return { getApiKey, setApiKey, getDifficulty, setDifficulty, getLearningPath, fetchConcept, fetchQuizGenerate }
}
