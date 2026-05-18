<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const emit = defineEmits(['ask-sub'])

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const selectedText = ref('')
const isEditing = ref(false)
const userInput = ref('')
const inputRef = ref(null)

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
  isEditing.value = false
  visible.value = true
}

function hide() {
  visible.value = false
  isEditing.value = false
  userInput.value = ''
}

function handleAsk() {
  const titleText = selectedText.value
  const promptText = isEditing.value ? userInput.value.trim() : ''
  if (!titleText) return
  emit('ask-sub', titleText, promptText)
  hide()
}

function startEdit() {
  userInput.value = selectedText.value
  isEditing.value = true
  nextTick(() => inputRef.value?.focus())
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleAsk()
  }
}

function onMouseUp(event) {
  if (visible.value) return
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
      class="fixed z-[100] rounded-xl shadow-2xl border py-2 px-2 animate-[fadeInUp_0.15s_ease-out] min-w-[220px]"
      :style="{ left: x + 'px', top: y + 'px' }"
      :class="'bg-[var(--color-surface)] border-[var(--color-border)]'"
    >
      <template v-if="!isEditing">
        <div class="flex items-center gap-1 px-2 mb-1">
          <span class="text-xs truncate flex-1" :class="'text-[var(--color-text-muted)]'">
            「{{ selectedText }}」
          </span>
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
            :class="'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'"
            @click.stop="startEdit"
            title="编辑补充说明"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </template>

      <template v-else>
        <textarea
          ref="inputRef"
          v-model="userInput"
          class="w-full rounded-lg px-3 py-2 text-sm border mb-2 resize-none outline-none transition-colors"
          :class="'bg-[var(--color-bg)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] border-[var(--color-border)] focus:border-[var(--color-accent)]'"
          rows="3"
          placeholder="补充说明..."
          @keydown="onKeydown"
        />
      </template>

      <button
        class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
        :class="'text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]'"
        @click.stop="handleAsk"
      >
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>深入探索「{{ selectedText }}」</span>
      </button>
    </div>
  </Teleport>
</template>
