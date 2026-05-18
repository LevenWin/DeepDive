<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useDeepSeek } from '../composables/useDeepSeek.js'
import { useLocalDB } from '../composables/useLocalDB.js'
import { useThread } from '../composables/useThread.js'
import { useToast } from '../composables/useToast.js'
import { searchQuery } from '../composables/useSearchEvent.js'
import { generateSlug } from '../utils/slug.js'
import PathTree from './PathTree.vue'
import ContentView from './ContentView.vue'
import ContextMenu from './ContextMenu.vue'
import HistoryPanel from './HistoryPanel.vue'
import { useTheme } from '../composables/useTheme.js'

const { theme, toggle } = useTheme()
const { show: toast } = useToast()

const { fetchConcept } = useDeepSeek()
const { saveThreadConcept, getThreadConcepts, deleteThreadConcepts } = useLocalDB()
const {
  threads, activeThreadId, activeThread,
  createThread, switchThread, addConceptToTree,
  cacheConceptData, getCachedConcept,
  navigateToSlug, deleteThread, clearActiveThread,
  getConceptPathToRoot, removeConceptFromTree,
} = useThread()

const currentConcept = ref(null)
const isCurrentDeletable = computed(() => {
  const thread = activeThread.value
  const slug = currentConcept.value?.slug
  return thread && slug && slug !== thread.rootSlug
})
const loading = ref(false)
const error = ref('')
const sidebarOpen = ref(false)
const historyOpen = ref(false)
const loadingSlugs = reactive(new Set())

watch(() => searchQuery.value, (query) => {
  if (query) {
    handleNewSearch(query)
    searchQuery.value = null
  }
})

onMounted(async () => {
  if (activeThread.value) {
    await restoreFromIndexedDB(activeThread.value.threadId)
    const cached = getCachedConcept(activeThread.value.currentSlug)
    if (cached?.content) {
      currentConcept.value = cached
    } else {
      currentConcept.value = cached || { title: activeThread.value.currentSlug }
      loading.value = true
      try { await loadConceptBySlug(activeThread.value.currentSlug) } catch (e) {
        loading.value = false
      }
    }
  }
})

function markLoading(slug) { loadingSlugs.add(slug) }
function unmarkLoading(slug) { loadingSlugs.delete(slug) }

function getFetchOptions(userPrompt) {
  const opts = { difficulty: '通俗' }
  if (userPrompt) opts.userPrompt = userPrompt
  const parent = currentConcept.value
  if (parent?.summary) opts.parentSummary = parent.summary
  else if (parent?.content) opts.parentSummary = parent.content.slice(0, 300)
  return opts
}

function persistConceptAsync(slug, data) {
  const thread = activeThread.value
  if (!thread) return
  saveThreadConcept(thread.threadId, slug, data).catch(() => {})
}

async function restoreFromIndexedDB(threadId) {
  try {
    const concepts = await getThreadConcepts(threadId)
    for (const [slug, data] of Object.entries(concepts)) {
      cacheConceptData(slug, data)
    }
  } catch (e) {}
}

async function handleNewSearch(conceptName) {
  error.value = ''
  loading.value = true
  const slug = generateSlug(conceptName)

  createThread(slug, conceptName, {
    slug, title: conceptName, content: '', summary: '',
    relatedConcepts: [], difficulty: '通俗', createdAt: Date.now(),
  })
  currentConcept.value = getCachedConcept(slug)

  try {
    const result = await fetchConcept(conceptName, { difficulty: '通俗' })
    const data = { ...result, slug, difficulty: '通俗', createdAt: Date.now() }
    cacheConceptData(slug, data)
    currentConcept.value = data
    loading.value = false
    persistConceptAsync(slug, data)

    if (result.relatedConcepts?.length) {
      for (const rc of result.relatedConcepts) {
        cacheConceptData(rc.slug, {
          slug: rc.slug, title: rc.term, content: '', summary: rc.summary || '',
          relatedConcepts: [], difficulty: '通俗', createdAt: Date.now(),
        })
      }
    }
  } catch (e) {
    const msg = e.message === 'API_KEY_MISSING' ? '请先设置 DeepSeek API Key'
      : e.name === 'AbortError' ? '请求超时，请检查网络后重试'
      : (e.message || '加载失败')
    error.value = msg
    toast(msg, 'error')
    loading.value = false
  }
}

async function loadConceptBySlug(slug, userPrompt) {
  const thread = activeThread.value
  if (!thread) return

  const cached = getCachedConcept(slug)
  if (cached?.content) {
    if (activeThread.value.currentSlug === slug) {
      currentConcept.value = cached
      loading.value = false
    }
    unmarkLoading(slug)
    return
  }

  try {
    const concept = thread.concepts[slug]
    const title = concept?.title || slug
    const result = await fetchConcept(title, getFetchOptions(userPrompt))
    const data = { ...result, slug, difficulty: '通俗', createdAt: Date.now() }
    cacheConceptData(slug, data)

    if (activeThread.value.currentSlug === slug) {
      currentConcept.value = data
      loading.value = false
    }

    persistConceptAsync(slug, data)

    if (result.relatedConcepts?.length) {
      for (const rc of result.relatedConcepts) {
        if (!thread.concepts[rc.slug]) {
          cacheConceptData(rc.slug, {
            slug: rc.slug, title: rc.term, content: '', summary: rc.summary || '',
            relatedConcepts: [], difficulty: '通俗', createdAt: Date.now(),
          })
        }
      }
    }
  } catch (e) {
    const msg = e.message === 'API_KEY_MISSING' ? '请先设置 DeepSeek API Key'
      : e.name === 'AbortError' ? '请求超时，请检查网络后重试'
      : (e.message || '加载失败')
    if (activeThread.value?.currentSlug === slug) {
      error.value = msg
      toast(msg, 'error')
      loading.value = false
    }
  } finally {
    unmarkLoading(slug)
  }
}

async function handleConceptClick({ slug, term }) {
  const thread = activeThread.value
  if (!thread) return

  const parentSlug = currentConcept.value?.slug
  addConceptToTree(parentSlug || 'root', slug, term, thread.concepts[slug] || null)
  navigateToSlug(slug)

  const cached = getCachedConcept(slug)
  if (cached?.content) {
    currentConcept.value = cached
    loading.value = false
    return
  }

  currentConcept.value = cached || { title: term, slug }
  loading.value = true
  markLoading(slug)
  try { await loadConceptBySlug(slug) } catch (e) { loading.value = false }
}

async function handleContextMenuAsk(text, userPrompt) {
  const thread = activeThread.value
  if (!thread) return
  console.log('[ConceptPage] handleContextMenuAsk:', text, 'userPrompt:', userPrompt?.length || 0, 'chars')

  const slug = generateSlug(text)
  const parentSlug = currentConcept.value?.slug || thread.rootSlug
  const existing = getCachedConcept(slug)

  if (existing?.content && userPrompt) {
    console.log('[ConceptPage] handleContextMenuAsk: concept exists, regenerating with userPrompt')
    navigateToSlug(slug)
    currentConcept.value = { ...existing }
    loading.value = true
    markLoading(slug)
    try {
      const result = await fetchConcept(text, getFetchOptions(userPrompt))
      const data = { ...result, slug, difficulty: '通俗', createdAt: Date.now() }
      cacheConceptData(slug, data)
      currentConcept.value = data
      loading.value = false
      persistConceptAsync(slug, data)
    } catch (e) {
      loading.value = false
    } finally {
      unmarkLoading(slug)
    }
    return
  }

  addConceptToTree(parentSlug, slug, text)
  navigateToSlug(slug)

  currentConcept.value = existing || { title: text, slug }
  loading.value = true
  markLoading(slug)
  try { await loadConceptBySlug(slug, userPrompt) } catch (e) { loading.value = false }
}

function handleDeleteCurrentNode() {
  const thread = activeThread.value
  const slug = currentConcept.value?.slug
  if (!thread || !slug || slug === thread.rootSlug) return
  console.log('[ConceptPage] handleDeleteCurrentNode:', slug)

  const path = getConceptPathToRoot(slug)
  removeConceptFromTree(slug)

  const parentSlug = path.length >= 2 ? path[path.length - 2] : thread.rootSlug
  const cached = getCachedConcept(parentSlug)
  currentConcept.value = cached || { title: parentSlug, slug: parentSlug }
  navigateToSlug(parentSlug)
  loading.value = false
}

async function handleRegenerate() {
  if (!currentConcept.value) return
  const title = currentConcept.value.title
  const slug = currentConcept.value.slug
  const thread = activeThread.value
  if (!thread) return

  loading.value = true
  error.value = ''
  try {
    const result = await fetchConcept(title, { difficulty: '通俗' })
    const data = { ...result, slug, difficulty: '通俗', createdAt: Date.now() }
    cacheConceptData(slug, data)
    currentConcept.value = data
    loading.value = false
    persistConceptAsync(slug, data)
  } catch (e) {
    const msg = e.name === 'AbortError' ? '请求超时，请检查网络后重试' : (e.message || '重新生成失败')
    error.value = msg
    toast(msg, 'error')
    loading.value = false
  }
}

function handleCopyContent() {
  if (!currentConcept.value?.content) return
  navigator.clipboard.writeText(currentConcept.value.content).then(
    () => toast('已复制到剪贴板', 'success', 2000),
    () => toast('复制失败', 'error'),
  )
}

function handleNewExplore() {
  clearActiveThread()
  currentConcept.value = null
  loading.value = false
  error.value = ''
}

async function handleThreadSwitch(threadId) {
  const oldId = activeThreadId.value
  if (oldId === threadId) return

  if (activeThread.value && activeThread.value.threadId === oldId) {
    const oldConcepts = { ...activeThread.value.concepts }
    ;(async () => {
      for (const [slug, data] of Object.entries(oldConcepts)) {
        if (data.content) {
          try { await saveThreadConcept(oldId, slug, data) } catch (e) {}
        }
      }
    })()
  }

  switchThread(threadId)
  loading.value = true
  error.value = ''

  const thread = threads.value.find((t) => t.threadId === threadId)
  if (!thread) { loading.value = false; return }

  await restoreFromIndexedDB(threadId)
  const slug = thread.rootSlug
  navigateToSlug(slug)

  const cached = getCachedConcept(slug)
  if (cached?.content) {
    currentConcept.value = cached
    loading.value = false
  } else {
    currentConcept.value = cached || { title: slug }
    try { await loadConceptBySlug(slug) } catch (e) { loading.value = false }
  }
}

async function handleThreadDelete(threadId) {
  const wasActive = activeThreadId.value === threadId
  deleteThread(threadId)
  deleteThreadConcepts(threadId).catch(() => {})
  if (wasActive) {
    const remaining = threads.value.filter((t) => t.rootSlug)
    if (remaining.length > 0) {
      await handleThreadSwitch(remaining[0].threadId)
    } else {
      handleNewExplore()
    }
  }
}

async function handlePathNodeClick(slug) {
  navigateToSlug(slug)
  const cached = getCachedConcept(slug)
  if (cached?.content) {
    currentConcept.value = cached
    loading.value = false
    return
  }
  currentConcept.value = cached || { title: slug, slug }
  loading.value = true
  markLoading(slug)
  try { await loadConceptBySlug(slug) } catch (e) { loading.value = false }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-[var(--color-bg)]">
    <header class="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0" :class="'border-[var(--color-border)] bg-[var(--color-bg)]'">
      <div class="flex items-center gap-2">
        <button
          class="lg:hidden p-1 rounded-lg transition-colors"
          :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 class="text-base font-bold text-[var(--color-text)]">
          <span class="text-[var(--color-accent)]">Deep</span>Dive
        </h1>
        <span v-if="activeThread" class="hidden sm:inline text-xs px-2 py-0.5 rounded-full" :class="'bg-[var(--color-surface)] text-[var(--color-text-muted)]'">
          {{ activeThread.rootTitle }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="text-xs w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="toggle"
          :title="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button
          class="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="historyOpen = !historyOpen"
        >
          {{ historyOpen ? '关闭历史' : '历史' }}
        </button>
        <button
          class="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="$emit('new-explore')"
        >
          新探索
        </button>
      </div>
    </header>

    <div v-if="error" class="flex-shrink-0 mx-4 mt-2">
      <div class="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2 text-sm">
        ⚠️ {{ error }}
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden relative">
      <div
        v-if="sidebarOpen"
        class="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
        @click="sidebarOpen = false"
      />

      <aside
        class="w-[280px] flex-shrink-0 border-r overflow-hidden transition-transform duration-300
          lg:relative lg:translate-x-0
          fixed inset-y-0 left-0 z-50"
        :class="[sidebarOpen ? 'translate-x-0' : '-translate-x-full', 'bg-[var(--color-surface)] border-[var(--color-border)]']"
      >
        <PathTree :loading-slugs="loadingSlugs" @node-click="handlePathNodeClick" />
      </aside>

      <main class="flex-1 overflow-hidden min-w-0" :class="'bg-[var(--color-bg)]'">
        <ContentView
          :concept="currentConcept"
          :loading="loading"
          :deletable="isCurrentDeletable"
          @concept-click="handleConceptClick"
          @regenerate="handleRegenerate"
          @copy-content="handleCopyContent"
          @delete-node="handleDeleteCurrentNode"
        />
        <ContextMenu @ask-sub="handleContextMenuAsk" />
      </main>

      <aside
        v-if="historyOpen"
        class="w-[280px] flex-shrink-0 border-l overflow-hidden transition-transform duration-300"
        :class="'bg-[var(--color-surface)] border-[var(--color-border)]'"
      >
        <HistoryPanel
          :threads="threads"
          :activeThreadId="activeThreadId"
          @switch="handleThreadSwitch"
          @delete="handleThreadDelete"
        />
      </aside>
    </div>
  </div>
</template>
