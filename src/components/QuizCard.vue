<script setup>
import { ref, computed } from 'vue'
import { useQuiz } from '../composables/useQuiz.js'
import { useDeepSeek } from '../composables/useDeepSeek.js'
import { useToast } from '../composables/useToast.js'
import QuizItem from './QuizItem.vue'
import QuizCategoryFilter from './QuizCategoryFilter.vue'
import QuizGenerateModal from './QuizGenerateModal.vue'

const props = defineProps({
  conceptSlug: { type: String, required: true },
  conceptTitle: { type: String, default: '' },
  conceptContent: { type: String, default: '' },
})

const { show: toast } = useToast()
const { getCategoryTree, getFilteredQuizzes, getQuizzes, answerQuiz, resetQuiz, addQuizzes } = useQuiz()
const { fetchQuizGenerate } = useDeepSeek()

const filter = ref({ categoryId: null, scope: 'direct' })
const generateModalVisible = ref(false)
const quizGenerating = ref(false)
const expanded = ref(true)

const categoryTree = computed(() => getCategoryTree())
const filteredQuizzes = computed(() => getFilteredQuizzes(props.conceptSlug, filter.value.categoryId, filter.value.scope))
const stats = computed(() => {
  const all = getQuizzes(props.conceptSlug)
  const answered = all.filter((q) => q.userAnswer !== null)
  const correct = answered.filter((q) => q.userAnswer === q.correctIndex)
  return { total: all.length, answered: answered.length, correct: correct.length }
})

function handleAnswer(quizId, selectedIndex) {
  answerQuiz(quizId, selectedIndex)
}

function handleReset(quizId) {
  resetQuiz(quizId)
}

async function handleGenerate({ categoryId, scope, count }) {
  if (!props.conceptContent) {
    toast('概念内容为空，无法生成考题', 'error')
    return
  }

  quizGenerating.value = true
  try {
    const quizzes = await fetchQuizGenerate(props.conceptTitle || props.conceptSlug, props.conceptContent, count)
    if (quizzes.length === 0) {
      toast('AI 未能生成题目，请重试', 'error')
      return
    }
    const quizData = quizzes.map((q) => ({
      conceptSlug: props.conceptSlug,
      categoryId: categoryId,
      scope: scope,
      ...q,
    }))
    addQuizzes(quizData)
    generateModalVisible.value = false
    filter.value = { categoryId, scope }
    toast(`已生成 ${quizzes.length} 道考核题`, 'success')
  } catch (e) {
    toast(e.message || '生成失败', 'error')
  } finally {
    quizGenerating.value = false
  }
}
</script>

<template>
  <div class="mt-8 border-t" :class="'border-[var(--color-border)]'">
    <button
      class="flex items-center gap-2 w-full pt-5 mb-4 text-left"
      @click="expanded = !expanded"
    >
      <svg class="w-3.5 h-3.5 transition-transform" :class="expanded ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <h3 class="text-sm font-semibold" :class="'text-[var(--color-text-secondary)]'">📝 知识考核</h3>
      <span v-if="stats.total > 0" class="text-xs" :class="'text-[var(--color-text-muted)]'">
        {{ stats.answered }}/{{ stats.total }}
        <span v-if="stats.answered > 0"> · {{ stats.correct }} 正确</span>
      </span>
    </button>

    <div v-if="expanded" class="space-y-4 pb-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <QuizCategoryFilter
          v-if="categoryTree.length > 0"
          :categories="categoryTree"
          :model-value="filter"
          @update:model-value="filter = $event"
        />
        <button
          class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          :class="'bg-[var(--color-accent)] text-white hover:opacity-90'"
          @click="generateModalVisible = true"
        >
          AI 生成题目
        </button>
      </div>

      <div v-if="filteredQuizzes.length === 0 && !quizGenerating" class="text-center py-8 text-sm" :class="'text-[var(--color-text-muted)]'">
        暂无考核题，
        <button
          class="underline transition-colors"
          :class="'text-[var(--color-accent)] hover:opacity-80'"
          @click="generateModalVisible = true"
        >
          点击生成
        </button>
      </div>

      <div v-else class="space-y-3">
        <div v-if="quizGenerating" class="rounded-xl p-5" :class="'bg-[var(--color-surface)]'">
          <div class="flex flex-col items-center py-4 gap-3">
            <div class="relative mx-auto">
              <div class="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] flex items-center justify-center">
                <svg class="w-5 h-5 text-[var(--color-accent)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation-duration: 2s">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
            <div class="text-center">
              <p class="text-xs font-medium" :class="'text-[var(--color-text-secondary)]'">正在生成考核题...</p>
            </div>
          </div>
          <div class="space-y-2.5 mt-3">
            <div class="h-3 rounded animate-pulse w-3/4" :class="'bg-[var(--color-border)]'" />
            <div class="h-3 rounded animate-pulse w-full" :class="'bg-[var(--color-border)]'" />
            <div class="h-3 rounded animate-pulse w-1/2" :class="'bg-[var(--color-border)]'" />
          </div>
        </div>
        <QuizItem
          v-for="(quiz, idx) in filteredQuizzes"
          :key="quiz.id"
          :quiz="quiz"
          :index="idx"
          @answer="handleAnswer"
          @reset="handleReset"
        />
      </div>
    </div>

    <QuizGenerateModal
      :visible="generateModalVisible"
      :categories="categoryTree"
      :generating="quizGenerating"
      @close="generateModalVisible = false"
      @generate="handleGenerate"
    />
  </div>
</template>
