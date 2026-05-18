<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { renderMarkdown } from '../utils/markdown.js'
import RelatedConcepts from './RelatedConcepts.vue'
import QuizCard from './QuizCard.vue'

const props = defineProps({
  concept: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  deletable: { type: Boolean, default: false },
})

const emit = defineEmits(['concept-click', 'regenerate', 'copy-content', 'delete-node'])

const contentRef = ref(null)
const fadeIn = ref(false)
const copied = ref(false)
let prevConcept = null

watch(() => props.concept, (newVal) => {
  console.log('[ContentView] concept changed, hasContent:', !!newVal?.content, 'loading:', props.loading)
  if (newVal && newVal !== prevConcept) {
    fadeIn.value = false
    nextTick(() => { fadeIn.value = true })
  }
  prevConcept = newVal
})

const renderedHtml = computed(() => {
  if (!props.concept) {
    console.log('[ContentView] renderedHtml: concept is null')
    return ''
  }
  if (!props.concept.content) {
    console.log('[ContentView] renderedHtml: content is empty, slug:', props.concept.slug)
    return ''
  }
  const t0 = performance.now()
  try {
    const html = renderMarkdown(props.concept.content, props.concept.relatedConcepts || [])
    if (!html) throw new Error('renderMarkdown returned empty')
    console.log(`[ContentView] renderedHtml done in ${(performance.now() - t0).toFixed(0)}ms, ${html.length} chars`)
    return html
  } catch (e) {
    console.error('[ContentView] renderMarkdown error:', e)
    return `<pre style="color:var(--color-text-secondary);white-space:pre-wrap;font-family:inherit">${props.concept.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
  }
})

function handleContentClick(e) {
  const target = e.target.closest('[data-slug]')
  if (target) {
    const slug = target.getAttribute('data-slug')
    const term = target.getAttribute('data-term')
    if (slug && term) {
      console.log('[ContentView] concept-click:', term, slug)
      emit('concept-click', { slug, term })
    }
  }
}

function handleCopy() {
  console.log('[ContentView] copy-content')
  emit('copy-content')
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-8">
        <div class="relative">
          <div class="w-16 h-16 rounded-2xl bg-[var(--color-accent-bg)] flex items-center justify-center">
            <svg class="w-8 h-8 text-[var(--color-accent)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation-duration: 3s">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium" :class="'text-[var(--color-text-secondary)]'">AI 正在分析并生成深度解释</p>
          <p class="text-xs mt-1.5" :class="'text-[var(--color-text-muted)]'">这可能需要几秒钟</p>
        </div>
        <div class="w-48 h-1 rounded-full overflow-hidden" :class="'bg-[var(--color-border)]'">
          <div class="h-full w-1/2 rounded-full animate-[shimmer-bar_2s_ease-in-out_infinite]" :class="'bg-[var(--color-accent)]'" />
        </div>
      </div>

      <div v-else-if="!concept" class="flex flex-col items-center justify-center h-full" :class="'text-[var(--color-text-muted)]'">
        <div class="relative mb-6">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center" :class="'bg-[var(--color-surface)]'">
            <span class="text-3xl opacity-60">🔍</span>
          </div>
        </div>
        <p class="text-lg font-medium" :class="'text-[var(--color-text-secondary)]'">开始你的知识探索</p>
        <p class="text-sm mt-2 max-w-xs text-center text-[var(--color-text-muted)]">
          输入任何你感兴趣的概念，AI 将为你生成结构化、可交互的深度解释
        </p>
        <div class="mt-8 flex flex-wrap gap-2 justify-center">
          <span class="text-xs px-3 py-1.5 rounded-full" :class="'bg-[var(--color-surface)] text-[var(--color-text-muted)]'">机器学习</span>
          <span class="text-xs px-3 py-1.5 rounded-full" :class="'bg-[var(--color-surface)] text-[var(--color-text-muted)]'">Kafka</span>
          <span class="text-xs px-3 py-1.5 rounded-full" :class="'bg-[var(--color-surface)] text-[var(--color-text-muted)]'">量子计算</span>
          <span class="text-xs px-3 py-1.5 rounded-full" :class="'bg-[var(--color-surface)] text-[var(--color-text-muted)]'">Transformer</span>
        </div>
      </div>

      <div v-else>
        <div :class="['content-fade-in', { 'animate-paused opacity-0': !fadeIn }]">
          <div class="flex items-center gap-3 mb-6">
            <h1 class="text-2xl font-bold" :class="'text-[var(--color-text)]'">{{ concept.title }}</h1>
          </div>
          <div
            ref="contentRef"
            class="md-content text-base leading-relaxed"
            v-html="renderedHtml"
            @click="handleContentClick"
          />

          <div class="flex items-center gap-2 mt-8 pt-5 border-t" :class="'border-[var(--color-border)]'">
            <button
              class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              :class="copied
                ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
              @click="handleCopy"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {{ copied ? '已复制' : '复制全文' }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              :class="'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
              @click="emit('regenerate')"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新生成
            </button>
            <button
              v-if="deletable"
              class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              :class="'text-red-400 hover:bg-red-500/10'"
              @click="emit('delete-node')"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除此概念
            </button>
          </div>

          <div
            v-if="!loading && concept?.relatedConcepts?.length"
            class="mt-8"
          >
            <h3 class="text-sm font-semibold mb-3" :class="'text-[var(--color-text-secondary)]'">🔗 关联概念</h3>
            <RelatedConcepts
              :concepts="concept.relatedConcepts"
              @concept-click="(payload) => emit('concept-click', payload)"
            />
          </div>

          <QuizCard
            v-if="!loading && concept?.slug"
            :concept-slug="concept.slug"
            :concept-title="concept.title"
            :concept-content="concept.content"
          />
        </div>
      </div>
    </div>
  </div>
</template>
