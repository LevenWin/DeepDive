<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({ categoryId: null, scope: 'direct' }) },
})

const emit = defineEmits(['update:modelValue'])

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

function onCategoryChange(e) {
  emit('update:modelValue', { ...props.modelValue, categoryId: e.target.value || null })
}

function onScopeChange(scope) {
  emit('update:modelValue', { ...props.modelValue, scope })
}
</script>

<template>
  <div class="flex items-center gap-3">
    <select
      class="text-xs rounded-lg px-3 py-1.5 border transition-colors min-w-0"
      :class="'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none'"
      :value="modelValue.categoryId || ''"
      @change="onCategoryChange"
    >
      <option value="">全部</option>
      <option
        v-for="cat in flatCategories"
        :key="cat.id"
        :value="cat.id"
        :style="{ paddingLeft: `${12 + cat._depth * 16}px` }"
      >
        {{ cat.name }}
      </option>
    </select>

    <div class="flex rounded-lg border overflow-hidden text-xs" :class="'border-[var(--color-border)]'">
      <button
        class="px-3 py-1.5 transition-colors"
        :class="modelValue.scope === 'direct'
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
        @click="onScopeChange('direct')"
      >
        该分类
      </button>
      <button
        class="px-3 py-1.5 transition-colors"
        :class="modelValue.scope === 'descendants'
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'"
        @click="onScopeChange('descendants')"
      >
        含子分类
      </button>
    </div>
  </div>
</template>
