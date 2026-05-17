<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useAPI } from '../composables/useAPI.js'
import { useThread } from '../composables/useThread.js'
import { useToast } from '../composables/useToast.js'
import { searchQuery } from '../composables/useSearchEvent.js'
import { generateSlug } from '../utils/slug.js'
import PathTree from './PathTree.vue'
import ContentView from './ContentView.vue'
import ContextMenu from './ContextMenu.vue'
import HistoryPanel from './HistoryPanel.vue'
import { useTheme } from '../composables/useTheme.js'

const emit = defineEmits(['new-explore'])

const { theme, toggle } = useTheme()
const { show: toast } = useToast()
const api = useAPI()
const {
  threads, activeThreadId, activeThread,
  loadThreadsList, loadThreadDetail,
  setActiveThread, switchThread,
  ingestConceptFromServer, placeholderConcept,
  navigateToSlug, getCachedConcept, deleteThread, clearActiveThread,
} = useThread()

const currentConcept = ref(null)
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
  try { await loadThreadsList() } catch (e) {
    console.warn('[ConceptPage] loadThreadsList failed:', e.message)
  }

  if (activeThread.value) {
    loading.value = true
    try {
      await loadThreadDetail(activeThread.value.threadId)
      const slug = activeThread.value.currentSlug
      const cached = getCachedConcept(slug)
      if (cached?.content) {
        currentConcept.value = cached
        loading.value = false
      } else {
        currentConcept.value = cached || { title: slug, slug }
        await loadConceptBySlug(slug, cached?.parentSlug || null)
      }
    } catch (e) {
      console.error('[ConceptPage] mount restore failed:', e.message)
      loading.value = false
    }
  }
})

function markLoading(slug) { loadingSlugs.add(slug) }
function unmarkLoading(slug) { loadingSlugs.delete(slug) }

async function callFetchConcept({ conceptName, threadId, parentSlug }) {
  return api.fetchConcept(conceptName, threadId, parentSlug)
}

async function handleNewSearch(conceptName) {
  error.value = ''
  loading.value = true
  currentConcept.value = { title: conceptName, slug: generateSlug(conceptName) }

  try {
    const { thread, concept } = await callFetchConcept({ conceptName })
    await loadThreadDetail(thread.id)
    setActiveThread(thread.id)
    ingestConceptFromServer(thread.id, null, concept)
    currentConcept.value = getCachedConcept(concept.slug)
    loading.value = false
  } catch (e) {
    error.value = e.message || '加载失败'
    toast(error.value, 'error')
    loading.value = false
  }
}

async function loadConceptBySlug(slug, parentSlug = null) {
  const thread = activeThread.value
  if (!thread) return

  const cached = getCachedConcept(slug)
  if (cached?.content) {
    if (thread.currentSlug === slug) {
      currentConcept.value = cached
      loading.value = false
    }
    unmarkLoading(slug)
    return
  }

  const title = cached?.title || slug
  const effectiveParent = parentSlug ?? cached?.parentSlug ?? null
  try {
    const { concept } = await callFetchConcept({
      conceptName: title,
      threadId: thread.threadId,
      parentSlug: effectiveParent,
    })
    ingestConceptFromServer(thread.threadId, effectiveParent, concept)

    if (activeThread.value.currentSlug === slug) {
      currentConcept.value = getCachedConcept(slug)
      loading.value = false
    }
  } catch (e) {
    if (activeThread.value?.currentSlug === slug) {
      error.value = e.message || '加载失败'
      toast(error.value, 'error')
      loading.value = false
    }
  } finally {
    unmarkLoading(slug)
  }
}

async function handleConceptClick({ slug, term }) {
  const thread = activeThread.value
  if (!thread) return

  const parentSlug = currentConcept.value?.slug || thread.rootSlug
  placeholderConcept(slug, term, parentSlug)
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
  await loadConceptBySlug(slug, parentSlug)
}

async function handleContextMenuAsk(text) {
  const thread = activeThread.value
  if (!thread) return
  const slug = generateSlug(text)
  const parentSlug = currentConcept.value?.slug || thread.rootSlug

  placeholderConcept(slug, text, parentSlug)
  navigateToSlug(slug)
  currentConcept.value = getCachedConcept(slug) || { title: text, slug }
  loading.value = true
  markLoading(slug)
  await loadConceptBySlug(slug, parentSlug)
}

async function handleRegenerate() {
  if (!currentConcept.value) return
  const thread = activeThread.value
  if (!thread) return
  const title = currentConcept.value.title
  const slug = currentConcept.value.slug
  const parentSlug = currentConcept.value.parentSlug || null

  loading.value = true
  error.value = ''
  try {
    const { concept } = await callFetchConcept({
      conceptName: title,
      threadId: thread.threadId,
      parentSlug,
    })
    ingestConceptFromServer(thread.threadId, parentSlug, concept)
    currentConcept.value = getCachedConcept(slug)
    loading.value = false
  } catch (e) {
    error.value = e.message || '重新生成失败'
    toast(error.value, 'error')
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
  emit('new-explore')
}

async function handleThreadSwitch(threadId) {
  if (activeThreadId.value === threadId) return
  setActiveThread(threadId)
  loading.value = true
  error.value = ''
  try {
    const thread = await loadThreadDetail(threadId)
    const slug = thread.currentSlug || thread.rootSlug
    navigateToSlug(slug)
    const cached = getCachedConcept(slug)
    if (cached?.content) {
      currentConcept.value = cached
      loading.value = false
    } else {
      currentConcept.value = cached || { title: slug, slug }
      await loadConceptBySlug(slug, cached?.parentSlug || null)
    }
  } catch (e) {
    error.value = e.message || '切换失败'
    toast(error.value, 'error')
    loading.value = false
  }
}

async function handleThreadDelete(threadId) {
  const wasActive = activeThreadId.value === threadId
  await deleteThread(threadId)
  if (wasActive) {
    const remaining = threads.value
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
  await loadConceptBySlug(slug, cached?.parentSlug || null)
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
          @click="handleNewExplore"
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
          @concept-click="handleConceptClick"
          @regenerate="handleRegenerate"
          @copy-content="handleCopyContent"
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
