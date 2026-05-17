<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { useTheme } from './composables/useTheme.js'
import { useThread } from './composables/useThread.js'
import { useAuth } from './composables/useAuth.js'
import { searchQuery } from './composables/useSearchEvent.js'
import SearchBar from './components/SearchBar.vue'
import ConceptPage from './components/ConceptPage.vue'
import ToastContainer from './components/ToastContainer.vue'
import LoginScreen from './components/LoginScreen.vue'

const { theme, toggle } = useTheme()
const {
  threads, activeThread,
  loadThreadsList, switchThread,
  clearActiveThread, deleteThread, resetAll,
} = useThread()
const { user, loading: authLoading, signOut } = useAuth()

const currentView = ref('home')
const showHistory = ref(false)
const menuOpen = ref(false)

const displayName = computed(() => {
  if (!user.value) return ''
  return (
    user.value.user_metadata?.full_name ||
    user.value.user_metadata?.name ||
    user.value.email ||
    '已登录'
  )
})

const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url || '')

watch(user, async (u, prev) => {
  if (u && !prev) {
    try { await loadThreadsList() } catch (e) {}
    if (activeThread.value) currentView.value = 'concept'
  } else if (!u && prev) {
    resetAll()
    currentView.value = 'home'
  }
}, { immediate: true })

async function handleSearch(conceptName) {
  currentView.value = 'concept'
  await nextTick()
  searchQuery.value = conceptName
}

function handleNewExplore() {
  clearActiveThread()
  currentView.value = 'home'
}

async function handleThreadClick(threadId) {
  await switchThread(threadId)
  showHistory.value = false
  currentView.value = 'concept'
}

function handleThreadDelete(threadId) {
  deleteThread(threadId)
}

async function handleSignOut() {
  menuOpen.value = false
  await signOut()
}

function formatTime(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen" :class="'bg-[var(--color-bg)] text-[var(--color-text)]'">
    <ToastContainer />

    <div v-if="authLoading" class="min-h-screen flex items-center justify-center">
      <div class="text-sm" :class="'text-[var(--color-text-muted)]'">载入中…</div>
    </div>

    <LoginScreen v-else-if="!user" />

    <template v-else>
      <div v-if="currentView === 'home'" class="min-h-screen flex flex-col items-center justify-center px-4">
        <div class="fixed top-4 right-4 flex items-center gap-2">
          <div class="relative">
            <button
              class="flex items-center gap-2 text-xs px-2 py-1 rounded-lg transition-colors"
              :class="'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
              @click="menuOpen = !menuOpen"
            >
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="w-6 h-6 rounded-full" />
              <span v-else class="w-6 h-6 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-[10px] font-bold">
                {{ (displayName[0] || 'U').toUpperCase() }}
              </span>
              <span class="max-w-[120px] truncate">{{ displayName }}</span>
            </button>
            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-44 rounded-lg border shadow-lg overflow-hidden z-50"
              :class="'bg-[var(--color-surface)] border-[var(--color-border)]'"
            >
              <button
                class="w-full text-left px-3 py-2 text-xs transition-colors"
                :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
                @click="handleSignOut"
              >
                退出登录
              </button>
            </div>
          </div>
          <button
            class="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            :class="'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
            @click="toggle"
          >
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>

        <div class="text-center mb-10">
          <h1 class="text-5xl font-bold mb-3">
            <span class="text-[var(--color-accent)]">Concept</span><span class="text-[var(--color-text)]">DeepDive</span>
          </h1>
          <p class="text-lg text-[var(--color-text-secondary)]">AI 驱动的深度知识探索工具</p>
          <p class="text-sm mt-2 text-[var(--color-text-muted)]">由 DeepSeek 提供智能支持</p>
        </div>

        <SearchBar @search="handleSearch" />

        <div class="mt-8 flex gap-4 items-center flex-wrap justify-center">
          <button
            class="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-all border"
            :class="threads.length > 0
              ? 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] opacity-60'"
            @click="showHistory = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            历史探索{{ threads.length > 0 ? ` (${threads.length})` : '' }}
          </button>
        </div>

        <Teleport to="body">
          <div
            v-if="showHistory"
            class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
            @click.self="showHistory = false"
          >
            <div class="rounded-2xl w-full max-w-lg mx-4 shadow-2xl border max-h-[65vh] flex flex-col" :class="'bg-[var(--color-surface)] border-[var(--color-border)]'">
              <div class="flex items-center justify-between px-5 py-4 border-b" :class="'border-[var(--color-border)]'">
                <h2 class="text-base font-semibold" :class="'text-[var(--color-text)]'">📚 历史探索</h2>
                <button
                  class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  :class="'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'"
                  @click="showHistory = false"
                >
                  ✕
                </button>
              </div>
              <div class="overflow-y-auto p-3 space-y-1.5">
                <div
                  v-for="thread in threads"
                  :key="thread.threadId"
                  class="flex items-center gap-3 rounded-xl p-3 transition-all cursor-pointer group"
                  :class="'hover:bg-[var(--color-accent-bg)]'"
                  @click="handleThreadClick(thread.threadId)"
                >
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="'bg-[var(--color-bg)]'">
                    <span class="text-sm">🔍</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate" :class="'text-[var(--color-text)]'">{{ thread.rootTitle }}</div>
                    <div class="text-xs mt-0.5" :class="'text-[var(--color-text-muted)]'">
                      {{ formatTime(thread.updatedAt || thread.createdAt) }}
                    </div>
                  </div>
                  <button
                    class="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                    :class="'text-red-400 hover:bg-red-500/10'"
                    @click.stop="handleThreadDelete(thread.threadId)"
                    title="删除"
                  >
                    🗑
                  </button>
                </div>
                <div v-if="threads.length === 0" class="text-center py-12 text-sm" :class="'text-[var(--color-text-muted)]'">
                  暂无历史记录
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <ConceptPage v-else @new-explore="handleNewExplore" />
    </template>
  </div>
</template>
