<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  quiz: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['answer', 'reset'])

const selectedIndex = ref(null)
const isSubmitted = computed(() => props.quiz.userAnswer !== null)
const isCorrect = computed(() => props.quiz.userAnswer === props.quiz.correctIndex)

function selectOption(idx) {
  if (isSubmitted.value) return
  selectedIndex.value = idx
}

function submitAnswer() {
  if (selectedIndex.value === null) return
  emit('answer', props.quiz.id, selectedIndex.value)
}

function handleReset() {
  emit('reset', props.quiz.id)
  selectedIndex.value = null
}

function getOptionClass(idx) {
  if (!isSubmitted.value) {
    return selectedIndex.value === idx
      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
  }
  if (idx === props.quiz.correctIndex) {
    return 'border-green-500 bg-green-500/10'
  }
  if (idx === props.quiz.userAnswer && !isCorrect.value) {
    return 'border-red-500 bg-red-500/10'
  }
  return 'border-[var(--color-border)] opacity-60'
}

function getOptionLetter(idx) {
  return String.fromCharCode(65 + idx)
}
</script>

<template>
  <div class="rounded-xl p-4 transition-all duration-200" :class="isSubmitted ? (isCorrect ? 'border border-green-500/30 bg-green-500/5' : 'border border-red-500/30 bg-red-500/5') : 'bg-[var(--color-surface)]'">
    <p class="text-sm font-medium mb-3" :class="'text-[var(--color-text)]'">
      <span class="text-xs mr-1.5" :class="'text-[var(--color-text-muted)]'">{{ index + 1 }}.</span>
      {{ quiz.question }}
    </p>

    <div class="space-y-2 mb-3">
      <button
        v-for="(option, idx) in quiz.options"
        :key="idx"
        class="w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all duration-150"
        :class="getOptionClass(idx)"
        @click="selectOption(idx)"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border"
            :class="
              !isSubmitted && selectedIndex === idx
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : isSubmitted && idx === quiz.correctIndex
                ? 'bg-green-500 text-white border-green-500'
                : isSubmitted && idx === quiz.userAnswer && !isCorrect
                ? 'bg-red-500 text-white border-red-500'
                : 'text-[var(--color-text-muted)] border-[var(--color-border)]'
            "
          >
            <template v-if="isSubmitted && idx === quiz.correctIndex">✓</template>
            <template v-else-if="isSubmitted && idx === quiz.userAnswer && !isCorrect">✗</template>
            <template v-else>{{ getOptionLetter(idx) }}</template>
          </span>
          <span :class="isSubmitted && idx === quiz.correctIndex ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'">{{ option }}</span>
        </div>
      </button>
    </div>

    <div v-if="!isSubmitted" class="flex items-center justify-between">
      <span class="text-xs" :class="'text-[var(--color-text-muted)]'">选择答案后提交</span>
      <button
        class="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="selectedIndex !== null
          ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
          : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'"
        :disabled="selectedIndex === null"
        @click="submitAnswer"
      >
        提交
      </button>
    </div>

    <div v-else class="space-y-2">
      <div class="flex items-center gap-2">
        <span v-if="isCorrect" class="text-xs font-medium text-green-500">✅ 正确</span>
        <span v-else class="text-xs font-medium text-red-400">❌ 错误，正确答案是 {{ getOptionLetter(quiz.correctIndex) }}</span>
      </div>
      <div v-if="quiz.explanation" class="text-xs rounded-lg px-3 py-2" :class="'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'">
        📖 {{ quiz.explanation }}
      </div>
      <button
        class="text-xs underline transition-colors"
        :class="'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="handleReset"
      >
        重新作答
      </button>
    </div>
  </div>
</template>
