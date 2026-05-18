import { ref, computed, watch } from 'vue'
import { useThread } from './useThread.js'

const CATEGORIES_KEY = 'deepdive-categories'

function loadCategories() {
  try {
    return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
}

function generateId() {
  return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}

function generateQuizId() {
  return 'qz_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}

export function useQuiz() {
  const { activeThread, saveThreads, saveThreads: flushThreads } = useThread()
  const categories = ref(loadCategories())

  function flushCategories() {
    saveCategories(categories.value)
  }

  function getCategoryTree() {
    const roots = categories.value.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
    function buildTree(parentId) {
      return categories.value
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ ...c, children: buildTree(c.id) }))
    }
    return roots.map((r) => ({ ...r, children: buildTree(r.id) }))
  }

  function getFlatCategoryList() {
    const result = []
    function walk(tree, depth) {
      for (const node of tree) {
        result.push({ ...node, _depth: depth })
        if (node.children) walk(node.children, depth + 1)
      }
    }
    walk(getCategoryTree(), 0)
    return result
  }

  function createCategory(name, parentId = null, color = '#10a37f') {
    if (!name?.trim()) return null
    const cat = {
      id: generateId(),
      name: name.trim(),
      parentId: parentId || null,
      color,
      sortOrder: categories.value.length,
      createdAt: Date.now(),
    }
    categories.value.push(cat)
    flushCategories()
    return cat
  }

  function updateCategory(id, updates) {
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    categories.value[idx] = { ...categories.value[idx], ...updates }
    flushCategories()
  }

  function deleteCategory(id) {
    for (const child of categories.value) {
      if (child.parentId === id) {
        child.parentId = null
      }
    }
    categories.value = categories.value.filter((c) => c.id !== id)
    flushCategories()
  }

  function getDescendantCategoryIds(categoryId) {
    const ids = [categoryId]
    const queue = [categoryId]
    while (queue.length > 0) {
      const pid = queue.shift()
      const children = categories.value.filter((c) => c.parentId === pid)
      for (const child of children) {
        ids.push(child.id)
        queue.push(child.id)
      }
    }
    return ids
  }

  function getQuizzes(conceptSlug) {
    const thread = activeThread.value
    if (!thread?.quizzes) return []
    return thread.quizzes
      .filter((q) => q.conceptSlug === conceptSlug)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  function getAllThreadQuizzes() {
    return activeThread.value?.quizzes || []
  }

  function addQuiz(quizData) {
    const thread = activeThread.value
    if (!thread) return null
    if (!thread.quizzes) thread.quizzes = []
    const quiz = {
      id: generateQuizId(),
      ...quizData,
      userAnswer: null,
      createdAt: Date.now(),
    }
    thread.quizzes.push(quiz)
    saveThreads()
    return quiz
  }

  function addQuizzes(quizzesData) {
    const thread = activeThread.value
    if (!thread) return []
    if (!thread.quizzes) thread.quizzes = []
    const newQuizzes = quizzesData.map((q) => ({
      id: generateQuizId(),
      ...q,
      userAnswer: null,
      createdAt: Date.now(),
    }))
    thread.quizzes.push(...newQuizzes)
    saveThreads()
    return newQuizzes
  }

  function updateQuiz(id, updates) {
    const thread = activeThread.value
    if (!thread?.quizzes) return
    const idx = thread.quizzes.findIndex((q) => q.id === id)
    if (idx === -1) return
    thread.quizzes[idx] = { ...thread.quizzes[idx], ...updates }
    saveThreads()
  }

  function deleteQuiz(id) {
    const thread = activeThread.value
    if (!thread?.quizzes) return
    thread.quizzes = thread.quizzes.filter((q) => q.id !== id)
    saveThreads()
  }

  function answerQuiz(id, selectedIndex) {
    updateQuiz(id, { userAnswer: selectedIndex })
  }

  function resetQuiz(id) {
    updateQuiz(id, { userAnswer: null })
  }

  function getFilteredQuizzes(conceptSlug, categoryId, scope) {
    const all = getQuizzes(conceptSlug)
    if (!categoryId) return all

    if (scope === 'direct') {
      return all.filter((q) => q.categoryId === categoryId)
    }

    const allowedIds = getDescendantCategoryIds(categoryId)
    return all.filter((q) => allowedIds.includes(q.categoryId))
  }

  function getQuizStats(conceptSlug) {
    const all = getQuizzes(conceptSlug)
    const answered = all.filter((q) => q.userAnswer !== null)
    const correct = answered.filter((q) => q.userAnswer === q.correctIndex)
    return {
      total: all.length,
      answered: answered.length,
      correct: correct.length,
    }
  }

  return {
    categories,
    flushCategories,
    getCategoryTree,
    getFlatCategoryList,
    createCategory,
    updateCategory,
    deleteCategory,
    getDescendantCategoryIds,
    getQuizzes,
    getAllThreadQuizzes,
    addQuiz,
    addQuizzes,
    updateQuiz,
    deleteQuiz,
    answerQuiz,
    resetQuiz,
    getFilteredQuizzes,
    getQuizStats,
  }
}
