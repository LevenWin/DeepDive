<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  visible: { type: Boolean, default: false },
  generating: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'generate'])

const selectedCategoryId = ref(null)
const scope = ref('direct')
const count = ref(5)

const flatCategories = computed(() => {
  const result = []
  function walk(list, depth) {
    for (const cat of (list || [])) {
      result.push({ ...cat, _depth: depth })
      if (cat.children) walk(cat.children, depth + 1)
    }
  }
  walk(props.categories, 0)
  return result
})

function handleGenerate() {
  emit('generate', {
    categoryId: selectedCategoryId.value,
    scope: scope.value,
    count: count.value,
  })
}

function handleClose() {
  if (props.generating) return
  selectedCategoryId.value = null
  scope.value = 'direct'
  count.value = 5
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div class="rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border" :class="'bg-[var(--color-surface)] border-[var(--color-border)]'">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-base font-semibold" :class="'text-[var(--color-text)]'">
            {{ generating ? '正在生成...' : 'AI 生成考核题' }}
          </h3>
          <button
            v-if="!generating"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            :class="'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <div v-if="generating" class="flex flex-col items-center py-8 gap-4">
          <div class="relative">
            <div class="w-14 h-14 rounded-2xl bg-[var(--color-accent-bg)] flex items-center justify-center">
              <svg class="w-7 h-7 text-[var(--color-accent)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation-duration: 2.5s">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <div class="text-center">
            <p class="text-sm font-medium" :class="'text-[var(--color-text-secondary)]'">AI 正在生成考核题</p>
            <p class="text-xs mt-1" :class="'text-[var(--color-text-muted)]'">基于当前概念内容分析中...</p>
          </div>
          <div class="w-36 h-1 rounded-full overflow-hidden" :class="'bg-[var(--color-border)]'">
            <div class="h-full w-3/4 rounded-full bg-[var(--color-accent)] animate-[shimmer-bar_2s_ease-in-out_infinite]" />
          </div>
        </div>

        <template v-else>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium mb-1.5" :class="'text-[var(--color-text-secondary)]'">分类</label>
              <select
                v-model="selectedCategoryId"
                class="w-full rounded-lg px-3 py-2 text-sm border transition-colors"
                :class="'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none'"
              >
                <option :value="null">不限分类</option>
                <option
                  v-for="cat in flatCategories"
                  :key="cat.id"
                  :value="cat.id"
                  :style="{ paddingLeft: `${12 + cat._depth * 16}px` }"
                >
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium mb-1.5" :class="'text-[var(--color-text-secondary)]'">范围</label>
              <div class="flex rounded-lg border overflow-hidden text-sm" :class="'border-[var(--color-border)]'">
                <button
                  class="flex-1 px-3 py-2 transition-colors"
                  :class="scope === 'direct'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
                  @click="scope = 'direct'"
                >
                  仅该分类
                </button>
                <button
                  class="flex-1 px-3 py-2 transition-colors"
                  :class="scope === 'descendants'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
                  @click="scope = 'descendants'"
                >
                  含所有子分类
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium mb-1.5" :class="'text-[var(--color-text-secondary)]'">题目数量</label>
              <div class="flex gap-2">
                <button
                  v-for="n in [3, 5, 10]"
                  :key="n"
                  class="flex-1 px-3 py-2 rounded-lg text-sm border transition-all"
                  :class="count === n
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'"
                  @click="count = n"
                >
                  {{ n }} 题
                </button>
              </div>
            </div>
          </div>

          <button
            class="w-full mt-5 rounded-lg py-2.5 text-sm font-medium transition-colors"
            :class="'bg-[var(--color-accent)] text-white hover:opacity-90'"
            @click="handleGenerate"
          >
            生成 {{ count }} 道题
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>
