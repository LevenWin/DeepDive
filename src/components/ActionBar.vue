<script setup>
import { ref } from 'vue'

defineProps({
  difficulty: { type: String, default: '通俗' },
})

const emit = defineEmits(['difficulty-change', 'regenerate', 'copy-content'])

const expanded = ref(false)

function onDifficultyInput(e) {
  emit('difficulty-change', e.target.value)
}
</script>

<template>
  <div class="border-t px-4 py-2" :class="'border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm'">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <button
          class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
          :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
          @click="expanded = !expanded"
        >
          <svg class="w-3.5 h-3.5 transition-transform" :class="expanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          <span>{{ expanded ? '收起' : '更多' }}</span>
        </button>
      </div>
      <button
        class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
        :class="'bg-[var(--color-accent)] hover:opacity-90 text-white'"
        @click="emit('regenerate')"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        重新生成
      </button>
    </div>

    <div
      v-if="expanded"
      class="mt-3 pt-3 border-t flex flex-col gap-3 animate-[fadeInUp_0.2s_ease-out]"
      :class="'border-[var(--color-border)]'"
    >
      <div class="flex items-center gap-3">
        <span class="text-xs whitespace-nowrap" :class="'text-[var(--color-text-muted)]'">难度</span>
        <span class="text-xs w-7 text-center" :class="'text-[var(--color-text-muted)]'">{{ difficulty }}</span>
        <input
          type="range"
          class="flex-1 h-1 accent-[var(--color-accent)]"
          :value="difficulty === '学术' ? 1 : 0"
          @input="onDifficultyInput"
          min="0"
          max="1"
          step="1"
        />
        <span class="text-xs" style="min-width:24px;text-align:right" :class="'text-[var(--color-text-muted)]'">{{ difficulty === '通俗' ? '学术' : '通俗' }}</span>
      </div>
      <button
        class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors w-fit"
        :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
        @click="emit('copy-content')"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        复制全文
      </button>
    </div>
  </div>
</template>
