<script setup>
import { computed } from 'vue'
import { useThread } from '../composables/useThread.js'

const props = defineProps({
  loadingSlugs: { type: Set, default: () => new Set() },
})

const emit = defineEmits(['node-click'])

const { activeThread, navigateToSlug, getChildren, treeVersion } = useThread()

function renderTree(slug, depth = 0, visited = new Set()) {
  if (!slug || visited.has(slug) || depth > 50) return []
  visited.add(slug)
  const concept = activeThread.value?.concepts[slug]
  if (!concept) return []
  const children = getChildren(slug).filter((c) => c && c !== slug)
  const items = [{
    slug,
    title: concept.title || slug,
    depth,
    hasChildren: children.length > 0,
  }]
  for (const childSlug of children) {
    items.push(...renderTree(childSlug, depth + 1, visited))
  }
  return items
}

const treeItems = computed(() => {
  treeVersion.value
  const thread = activeThread.value
  if (!thread) return []
  return renderTree(thread.rootSlug)
})

function handleNodeClick(slug) {
  navigateToSlug(slug)
  emit('node-click', slug)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 border-b" :class="'border-[var(--color-border)]'">
      <h2 class="text-xs font-semibold uppercase tracking-wider" :class="'text-[var(--color-text-muted)]'">
        📍 探索路径
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto py-2 px-2">
      <div v-if="!activeThread || treeItems.length === 0" class="text-center mt-8 px-4 text-sm" :class="'text-[var(--color-text-muted)]'">
        搜索一个概念开始你的知识探索之旅
      </div>

      <div v-else class="space-y-0.5">
        <button
          v-for="item in treeItems"
          :key="item.slug"
          :style="{ paddingLeft: `${12 + item.depth * 16}px` }"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 group"
          :class="item.slug === activeThread?.currentSlug
            ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="handleNodeClick(item.slug)"
        >
          <svg
            v-if="props.loadingSlugs.has(item.slug)"
            class="w-3.5 h-3.5 flex-shrink-0 animate-spin"
            :class="'text-[var(--color-accent)]'"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg
            v-else-if="item.depth === 0"
            class="w-3.5 h-3.5 flex-shrink-0"
            :class="item.slug === activeThread?.currentSlug ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg
            v-else
            class="w-3 h-3 flex-shrink-0"
            :class="item.slug === activeThread?.currentSlug ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)]'"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="truncate">{{ item.title }}</span>
          <span v-if="item.hasChildren" class="ml-auto text-xs opacity-50">{{ getChildren(item.slug).length }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
