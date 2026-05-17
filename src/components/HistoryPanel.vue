<script setup>
defineProps({
  threads: { type: Array, default: () => [] },
  activeThreadId: { type: String, default: null },
})

const emit = defineEmits(['switch', 'delete'])

function formatTime(ts) {
  const date = new Date(ts)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        📚 历史探索
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto py-2 px-2">
      <div v-if="threads.length === 0" class="text-center mt-8 px-4 text-sm text-[var(--color-text-muted)]">
        暂无历史记录
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="thread in threads"
          :key="thread.threadId"
          class="relative group"
        >
          <button
            class="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center gap-3"
            :class="thread.threadId === activeThreadId
              ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
            @click="emit('switch', thread.threadId)"
          >
            <span class="text-sm">🔍</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ thread.rootTitle }}</div>
              <div class="text-xs mt-0.5 text-[var(--color-text-muted)]">
                {{ formatTime(thread.updatedAt || thread.createdAt) }}
                <span v-if="thread.tree"> · {{ Object.keys(thread.concepts || {}).length }} 个概念</span>
              </div>
            </div>
          </button>
          <button
            class="absolute top-2 right-2 text-xs p-1 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors lg:opacity-0 group-hover:opacity-100"
            @click.stop="emit('delete', thread.threadId)"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
