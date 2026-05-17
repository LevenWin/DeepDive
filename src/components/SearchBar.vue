<script setup>
import { ref } from 'vue'

const query = ref('')
const emit = defineEmits(['search'])

function handleSubmit() {
  const trimmed = query.value.trim()
  if (trimmed) {
    emit('search', trimmed)
  }
}
</script>

<template>
  <div class="flex items-center justify-center w-full px-4">
    <div class="relative w-full max-w-2xl">
      <textarea
        v-model="query"
        rows="1"
        placeholder="输入任意概念，开始深度探索..."
        class="w-full rounded-xl px-5 py-4 pb-14 text-lg border transition-all duration-200 shadow-lg resize-none overflow-y-auto"
        :class="'bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] border-transparent focus:border-[var(--color-accent)] focus:outline-none'"
        @input="(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }"
        @keydown.enter.prevent="() => {}"
      />
      <button
        class="absolute right-3 bottom-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
        :class="'bg-[var(--color-accent)] hover:opacity-90 text-white'"
        @click="handleSubmit"
      >
        探索
      </button>
    </div>
  </div>
</template>
