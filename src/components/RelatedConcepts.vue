<script setup>
defineProps({
  concepts: { type: Array, default: () => [] },
})
defineEmits(['concept-click'])
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="px-4 py-3 border-b" :class="'border-[var(--color-border)]'">
      <h2 class="text-xs font-semibold uppercase tracking-wider" :class="'text-[var(--color-text-muted)]'">
        🔗 关联子概念
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto py-2 px-3">
      <div v-if="concepts.length === 0" class="text-center mt-8 px-4 text-sm" :class="'text-[var(--color-text-muted)]'">
        暂无关联概念
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="concept in concepts"
          :key="concept.slug"
          class="w-full text-left p-3 rounded-xl border transition-all duration-200 group"
          :class="'bg-[var(--color-bg)] hover:bg-[var(--color-accent-bg)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'"
          @click="$emit('concept-click', { slug: concept.slug, term: concept.term })"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm transition-colors" :class="'text-[var(--color-accent)] group-hover:opacity-90'">
              {{ concept.term }}
            </span>
            <span class="transition-colors text-xs" :class="'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'">→</span>
          </div>
          <p class="text-xs line-clamp-2 transition-colors" :class="'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'">
            {{ concept.summary }}
          </p>
        </button>
      </div>
    </div>
  </div>
</template>
