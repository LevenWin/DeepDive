<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-xl px-4 py-3 shadow-2xl border text-sm max-w-sm animate-[fadeInUp_0.25s_ease-out] flex items-start gap-2.5"
        :class="toast.type === 'error'
          ? 'bg-red-500/95 border-red-400 text-white'
          : toast.type === 'success'
          ? 'bg-[var(--color-accent)]/95 border-[var(--color-accent)] text-white'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]'"
      >
        <span class="flex-shrink-0 mt-0.5">
          {{ toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️' }}
        </span>
        <span class="flex-1">{{ toast.message }}</span>
        <button
          class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
          @click="remove(toast.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </Teleport>
</template>
