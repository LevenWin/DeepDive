<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useToast } from '../composables/useToast.js'
import { useTheme } from '../composables/useTheme.js'

const { signInWithGoogle, signInWithApple } = useAuth()
const { show: toast } = useToast()
const { theme, toggle } = useTheme()

const busy = ref(null)

async function handleGoogle() {
  busy.value = 'google'
  try { await signInWithGoogle() } catch (e) {
    toast(e.message || '登录失败', 'error')
    busy.value = null
  }
}

async function handleApple() {
  busy.value = 'apple'
  try { await signInWithApple() } catch (e) {
    toast(e.message || '登录失败', 'error')
    busy.value = null
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4" :class="'bg-[var(--color-bg)] text-[var(--color-text)]'">
    <div class="fixed top-4 right-4">
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
      <p class="text-sm mt-2 text-[var(--color-text-muted)]">登录以开始你的知识探索之旅</p>
    </div>

    <div class="w-full max-w-sm space-y-3">
      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all font-medium text-sm"
        :class="busy === 'google'
          ? 'opacity-60 cursor-not-allowed bg-[var(--color-surface)] border-[var(--color-border)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]'"
        :disabled="busy !== null"
        @click="handleGoogle"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        <span>{{ busy === 'google' ? '跳转中…' : '使用 Google 登录' }}</span>
      </button>

      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all font-medium text-sm"
        :class="busy === 'apple'
          ? 'opacity-60 cursor-not-allowed bg-[var(--color-surface)] border-[var(--color-border)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]'"
        :disabled="busy !== null"
        @click="handleApple"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" :class="'fill-[var(--color-text)]'" aria-hidden="true">
          <path d="M17.05 12.04c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.78-3.12-2.03-3.8-2.06-1.62-.16-3.16.95-3.99.95-.82 0-2.08-.93-3.43-.9-1.76.02-3.39 1.02-4.3 2.6-1.83 3.18-.47 7.87 1.31 10.45.87 1.26 1.91 2.67 3.27 2.62 1.32-.05 1.82-.85 3.41-.85 1.6 0 2.05.85 3.43.82 1.42-.03 2.32-1.27 3.18-2.55 1-1.46 1.42-2.88 1.44-2.95-.03-.01-2.76-1.06-2.79-4.19zM14.85 4.05c.73-.88 1.22-2.1 1.08-3.32-1.05.04-2.32.7-3.07 1.58-.67.78-1.27 2.04-1.11 3.23 1.17.09 2.37-.6 3.1-1.49z" />
        </svg>
        <span>{{ busy === 'apple' ? '跳转中…' : '使用 Apple 登录' }}</span>
      </button>
    </div>

    <p class="mt-8 text-xs text-center max-w-sm" :class="'text-[var(--color-text-muted)]'">
      登录即表示你同意应用通过 Supabase 存储你的概念与历史，<br />
      首次登录会自动创建你的账号。
    </p>
  </div>
</template>
