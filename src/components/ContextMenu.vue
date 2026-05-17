<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['ask-sub'])

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const selectedText = ref('')

function show(event) {
  const selection = window.getSelection()
  const text = selection?.toString().trim()
  if (!text || text.length < 2) {
    hide()
    return
  }

  selectedText.value = text.slice(0, 50)
  x.value = event.clientX + 12
  y.value = event.clientY - 8
  visible.value = true
}

function hide() {
  visible.value = false
}

function handleAsk() {
  if (!selectedText.value) return
  emit('ask-sub', selectedText.value)
  hide()
}

function onMouseUp(event) {
  setTimeout(() => show(event), 0)
}

function onMouseDown(event) {
  if (event.target.closest('[data-selection-menu]')) return
  hide()
}

onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mousedown', onMouseDown)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousedown', onMouseDown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      data-selection-menu
      class="fixed z-[100] rounded-xl shadow-2xl border py-2 px-0.5 animate-[fadeInUp_0.15s_ease-out]"
      :style="{ left: x + 'px', top: y + 'px' }"
      :class="'bg-[var(--color-surface)] border-[var(--color-border)]'"
    >
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
        :class="'text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]'"
        @click.stop="handleAsk"
      >
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>深入探索「<strong>{{ selectedText }}</strong>」</span>
      </button>
    </div>
  </Teleport>
</template>
