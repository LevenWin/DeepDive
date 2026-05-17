import { ref, watch } from 'vue'

const STORAGE_KEY = 'deepdive-theme'
const theme = ref(loadTheme())

function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
}

applyTheme(theme.value)

watch(theme, (t) => {
  localStorage.setItem(STORAGE_KEY, t)
  applyTheme(t)
})

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    theme.value = e.matches ? 'light' : 'dark'
  }
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(t) {
    theme.value = t
  }

  return {
    theme,
    toggle,
    setTheme,
  }
}
