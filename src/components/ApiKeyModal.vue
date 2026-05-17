<script setup>
import { ref } from 'vue'
import { useDeepSeek } from '../composables/useDeepSeek.js'
import { useToast } from '../composables/useToast.js'

const emit = defineEmits(['saved'])

const { getApiKey, setApiKey } = useDeepSeek()
const { show: toast } = useToast()

const visible = ref(false)
const keyInput = ref('')
const reveal = ref(false)

function open() {
  keyInput.value = getApiKey()
  visible.value = true
}

function handleChange() {
  open()
}

function close() {
  visible.value = false
}

function save() {
  const trimmed = keyInput.value.trim()
  if (!trimmed) {
    toast('请输入 API Key', 'error')
    return
  }
  if (!trimmed.startsWith('sk-')) {
    toast('DeepSeek Key 通常以 sk- 开头', 'error')
    return
  }
  setApiKey(trimmed)
  toast('API Key 已保存', 'success', 2000)
  emit('saved')
  close()
}

defineExpose({ open, handleChange })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-2xl border shadow-2xl p-6"
        :class="'bg-[var(--color-surface)] border-[var(--color-border)]'"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold" :class="'text-[var(--color-text)]'">DeepSeek API Key</h2>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            :class="'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'"
            @click="close"
          >
            ✕
          </button>
        </div>

        <p class="text-xs mb-4" :class="'text-[var(--color-text-muted)]'">
          Key 仅保存在你的浏览器本地（localStorage），不会上传到任何服务器。可到
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            class="underline"
            :class="'text-[var(--color-accent)]'"
          >DeepSeek 控制台</a>
          创建。
        </p>

        <div class="relative mb-4">
          <input
            v-model="keyInput"
            :type="reveal ? 'text' : 'password'"
            placeholder="sk-..."
            class="w-full px-3 py-2.5 pr-20 rounded-lg border text-sm font-mono outline-none transition-colors"
            :class="'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent)]'"
            @keydown.enter="save"
          />
          <button
            type="button"
            class="absolute top-1/2 right-2 -translate-y-1/2 text-xs px-2 py-1 rounded transition-colors"
            :class="'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'"
            @click="reveal = !reveal"
          >
            {{ reveal ? '隐藏' : '显示' }}
          </button>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="text-sm px-3 py-1.5 rounded-lg transition-colors"
            :class="'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
            @click="close"
          >
            取消
          </button>
          <button
            class="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
            :class="'bg-[var(--color-accent)] text-white hover:opacity-90'"
            @click="save"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
