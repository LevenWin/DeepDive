import { ref, computed } from 'vue'
import { useAPI } from './useAPI.js'

const ACTIVE_THREAD_KEY = 'deepdive-active-thread'

const threads = ref([])
const activeThreadId = ref(localStorage.getItem(ACTIVE_THREAD_KEY) || null)
const treeVersion = ref(0)
const threadsLoaded = ref(false)

function bumpTree() { treeVersion.value++ }

function rowToThread(row, conceptRows = []) {
  const concepts = {}
  const tree = { root: [] }

  for (const c of conceptRows) {
    concepts[c.slug] = {
      slug: c.slug,
      title: c.title,
      content: c.content || '',
      summary: c.summary || '',
      relatedConcepts: c.relatedConcepts || [],
      difficulty: c.difficulty || '通俗',
      parentSlug: c.parentSlug || null,
      createdAt: new Date(c.createdAt).getTime(),
    }
    const parent = c.parentSlug || 'root'
    if (!tree[parent]) tree[parent] = []
    if (!tree[parent].includes(c.slug)) tree[parent].push(c.slug)
    if (!tree[c.slug]) tree[c.slug] = []
  }

  if (!tree.root.includes(row.rootSlug)) {
    tree.root.push(row.rootSlug)
  }
  if (!concepts[row.rootSlug]) {
    concepts[row.rootSlug] = {
      slug: row.rootSlug,
      title: row.rootTitle,
      content: '',
      summary: '',
      relatedConcepts: [],
      difficulty: '通俗',
      parentSlug: null,
      createdAt: new Date(row.createdAt).getTime(),
    }
  }

  return {
    threadId: row.id,
    rootSlug: row.rootSlug,
    rootTitle: row.rootTitle,
    currentSlug: row.currentSlug || row.rootSlug,
    categoryId: row.categoryId || null,
    isFavorite: !!row.isFavorite,
    tree,
    concepts,
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
  }
}

export function useThread() {
  const api = useAPI()

  const activeThread = computed(() =>
    threads.value.find((t) => t.threadId === activeThreadId.value) || null,
  )

  async function loadThreadsList() {
    const rows = await api.getThreads()
    threads.value = rows
      .map((r) => rowToThread(r, []))
      .sort((a, b) => b.updatedAt - a.updatedAt)
    threadsLoaded.value = true
    bumpTree()
  }

  async function loadThreadDetail(threadId) {
    const row = await api.getThread(threadId)
    const existingIdx = threads.value.findIndex((t) => t.threadId === threadId)
    const hydrated = rowToThread(row, row.concepts || [])
    if (existingIdx >= 0) {
      threads.value[existingIdx] = hydrated
    } else {
      threads.value.unshift(hydrated)
    }
    bumpTree()
    return hydrated
  }

  function setActiveThread(threadId) {
    activeThreadId.value = threadId
    if (threadId) localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
    else localStorage.removeItem(ACTIVE_THREAD_KEY)
  }

  function ingestConceptFromServer(threadId, parentSlug, conceptRow) {
    const thread = threads.value.find((t) => t.threadId === threadId)
    if (!thread) return
    const slug = conceptRow.slug

    thread.concepts[slug] = {
      slug,
      title: conceptRow.title || slug,
      content: conceptRow.content || '',
      summary: conceptRow.summary || '',
      relatedConcepts: conceptRow.relatedConcepts || [],
      difficulty: conceptRow.difficulty || '通俗',
      parentSlug: parentSlug || null,
      createdAt: thread.concepts[slug]?.createdAt || Date.now(),
    }

    const parentKey = parentSlug || 'root'
    if (!thread.tree[parentKey]) thread.tree[parentKey] = []
    if (parentKey !== slug && !thread.tree[parentKey].includes(slug)) {
      thread.tree[parentKey].push(slug)
    }
    if (!thread.tree[slug]) thread.tree[slug] = []

    thread.currentSlug = slug
    thread.updatedAt = Date.now()
    bumpTree()
  }

  function placeholderConcept(slug, title, parentSlug) {
    const thread = activeThread.value
    if (!thread) return
    if (!thread.concepts[slug]) {
      thread.concepts[slug] = {
        slug,
        title: title || slug,
        content: '',
        summary: '',
        relatedConcepts: [],
        difficulty: '通俗',
        parentSlug: parentSlug || null,
        createdAt: Date.now(),
      }
    }
    const parentKey = parentSlug || 'root'
    if (!thread.tree[parentKey]) thread.tree[parentKey] = []
    if (parentKey !== slug && !thread.tree[parentKey].includes(slug)) {
      thread.tree[parentKey].push(slug)
    }
    if (!thread.tree[slug]) thread.tree[slug] = []
    bumpTree()
  }

  async function switchThread(threadId) {
    setActiveThread(threadId)
    await loadThreadDetail(threadId)
  }

  function navigateToSlug(slug) {
    const thread = activeThread.value
    if (!thread) return
    thread.currentSlug = slug
    thread.updatedAt = Date.now()
  }

  function getCachedConcept(slug) {
    return activeThread.value?.concepts?.[slug] || null
  }

  function getChildren(slug) {
    const thread = activeThread.value
    if (!thread) return []
    return thread.tree[slug] || []
  }

  function getConceptPathToRoot(slug) {
    const thread = activeThread.value
    if (!thread) return []
    const path = [slug]
    let current = slug
    while (current !== 'root' && current !== thread.rootSlug) {
      let found = false
      for (const [parent, children] of Object.entries(thread.tree)) {
        if (children.includes(current)) {
          path.unshift(parent)
          current = parent
          found = true
          break
        }
      }
      if (!found) break
    }
    return path
  }

  function clearActiveThread() {
    setActiveThread(null)
  }

  async function deleteThread(threadId) {
    try { await api.deleteThread(threadId) } catch (e) {}
    threads.value = threads.value.filter((t) => t.threadId !== threadId)
    if (activeThreadId.value === threadId) {
      setActiveThread(null)
    }
  }

  function threadCount() {
    return threads.value.length
  }

  function resetAll() {
    threads.value = []
    threadsLoaded.value = false
    setActiveThread(null)
    bumpTree()
  }

  return {
    threads,
    activeThreadId,
    activeThread,
    threadsLoaded,
    treeVersion,
    loadThreadsList,
    loadThreadDetail,
    setActiveThread,
    switchThread,
    ingestConceptFromServer,
    placeholderConcept,
    navigateToSlug,
    getCachedConcept,
    getChildren,
    getConceptPathToRoot,
    clearActiveThread,
    deleteThread,
    threadCount,
    resetAll,
  }
}
