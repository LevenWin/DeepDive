import { ref, computed } from 'vue'

const STORAGE_KEY = 'deepdive-threads'

const threads = ref(loadThreads())
const activeThreadId = ref(localStorage.getItem('deepdive-active-thread') || null)
const treeVersion = ref(0)

function bumpTree() { treeVersion.value++ }

function generateId() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function loadThreads() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return raw.filter((t) => t.rootSlug && t.rootSlug.length > 0)
  } catch {
    return []
  }
}

function saveThreads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads.value))
}

export function useThread() {
  const activeThread = computed(() =>
    threads.value.find((t) => t.threadId === activeThreadId.value) || null,
  )

  function createThread(rootSlug, rootTitle, conceptData) {
    if (!rootSlug) rootSlug = 'root-' + Date.now().toString(36)
    const threadId = generateId()
    const thread = {
      threadId,
      rootSlug,
      rootTitle,
      tree: { root: [rootSlug] },
      concepts: {},
      quizzes: [],
      currentSlug: rootSlug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    if (conceptData) thread.concepts[rootSlug] = conceptData
    threads.value.unshift(thread)
    activeThreadId.value = threadId
    localStorage.setItem('deepdive-active-thread', threadId)
    saveThreads()
    bumpTree()
    return thread
  }

  function switchThread(threadId) {
    activeThreadId.value = threadId
    localStorage.setItem('deepdive-active-thread', threadId)
  }

  function addConceptToTree(parentSlug, childSlug, childTitle, conceptData) {
    const thread = activeThread.value
    if (!thread || !childSlug) return
    if (!parentSlug) parentSlug = 'root'
    if (parentSlug === childSlug) return

    if (!thread.tree[parentSlug]) thread.tree[parentSlug] = []
    if (!thread.tree[parentSlug].includes(childSlug)) thread.tree[parentSlug].push(childSlug)
    if (!thread.tree[childSlug]) thread.tree[childSlug] = []

    thread.concepts[childSlug] = conceptData || {
      slug: childSlug,
      title: childTitle || childSlug,
      content: '',
      relatedConcepts: [],
      difficulty: '通俗',
      createdAt: Date.now(),
    }

    thread.currentSlug = childSlug
    thread.updatedAt = Date.now()
    saveThreads()
    bumpTree()
  }

  function cacheConceptData(slug, data) {
    const thread = activeThread.value
    if (!thread) return
    thread.concepts[slug] = { ...thread.concepts[slug], ...data }
    thread.updatedAt = Date.now()
    saveThreads()
  }

  function getCachedConcept(slug) {
    return activeThread.value?.concepts?.[slug] || null
  }

  function getAllCachedConcepts() {
    return activeThread.value?.concepts || {}
  }

  function navigateToSlug(slug) {
    const thread = activeThread.value
    if (!thread) return
    thread.currentSlug = slug
    thread.updatedAt = Date.now()
    saveThreads()
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

  function getChildren(slug) {
    const thread = activeThread.value
    if (!thread) return []
    return thread.tree[slug] || []
  }

  function isConceptInTree(slug) {
    return !!activeThread.value?.concepts[slug]
  }

  function removeConceptFromTree(slug) {
    const thread = activeThread.value
    if (!thread) return
    for (const [, children] of Object.entries(thread.tree)) {
      const idx = children.indexOf(slug)
      if (idx !== -1) { children.splice(idx, 1); break }
    }
    delete thread.tree[slug]
    delete thread.concepts[slug]
    saveThreads()
    bumpTree()
  }

  function clearActiveThread() {
    activeThreadId.value = null
    localStorage.removeItem('deepdive-active-thread')
  }

  function deleteThread(threadId) {
    threads.value = threads.value.filter((t) => t.threadId !== threadId)
    if (activeThreadId.value === threadId) {
      activeThreadId.value = null
      localStorage.removeItem('deepdive-active-thread')
    }
    saveThreads()
  }

  function threadCount() { return threads.value.length }

  return {
    threads,
    activeThreadId,
    activeThread,
    treeVersion,
    createThread,
    switchThread,
    addConceptToTree,
    cacheConceptData,
    getCachedConcept,
    getAllCachedConcepts,
    navigateToSlug,
    getConceptPathToRoot,
    getChildren,
    isConceptInTree,
    removeConceptFromTree,
    clearActiveThread,
    deleteThread,
    threadCount,
    saveThreads,
  }
}
