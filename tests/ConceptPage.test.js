import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/composables/useSearchEvent.js', () => ({
  searchQuery: { value: null },
}))

vi.mock('../src/composables/useLocalDB.js', () => ({
  useLocalDB: () => ({
    getConcept: vi.fn().mockResolvedValue(null),
    saveConcept: vi.fn().mockResolvedValue(undefined),
    getAllConcepts: vi.fn().mockResolvedValue([]),
    saveThreadConcept: vi.fn().mockResolvedValue(undefined),
    getThreadConcept: vi.fn().mockResolvedValue(null),
    getThreadConcepts: vi.fn().mockResolvedValue({}),
    deleteThreadConcepts: vi.fn().mockResolvedValue(undefined),
  }),
}))

let threadTree = { root: [] }
let conceptCache = {}
let currentSlugVar = ''

vi.mock('../src/composables/useThread.js', () => ({
  useThread: () => ({
    threads: { value: [] },
    activeThreadId: { value: '' },
    activeThread: { value: null },
    createThread: vi.fn((slug, title, data) => {
      currentSlugVar = slug
      threadTree = { root: [slug] }
      conceptCache = { [slug]: data || { slug, title, content: '', relatedConcepts: [] } }
    }),
    switchThread: vi.fn(),
    addConceptToTree: vi.fn((parent, child, title, data) => {
      if (!threadTree[parent]) threadTree[parent] = []
      if (!threadTree[parent].includes(child)) threadTree[parent].push(child)
      conceptCache[child] = data || { slug: child, title: title || child, content: '', relatedConcepts: [] }
    }),
    cacheConceptData: vi.fn((slug, data) => {
      conceptCache[slug] = { ...conceptCache[slug], ...data }
    }),
    getCachedConcept: vi.fn((slug) => conceptCache[slug] || null),
    navigateToSlug: vi.fn((s) => { currentSlugVar = s }),
    deleteThread: vi.fn(),
    clearActiveThread: vi.fn(() => { currentSlugVar = ''; threadTree = { root: [] }; conceptCache = {} }),
    saveThreads: vi.fn(),
    removeConceptFromTree: vi.fn(),
    getChildren: vi.fn((s) => threadTree[s] || []),
    getConceptPathToRoot: vi.fn(() => []),
    treeVersion: { value: 0 },
  }),
}))

vi.mock('../src/composables/useDeepSeek.js', () => ({
  useDeepSeek: () => ({
    fetchConcept: vi.fn().mockResolvedValue({
      title: '机器学习',
      slug: 'ml',
      content: '## 机器学习\n\n机器学习是人工智能的分支。',
      relatedConcepts: [{ term: '监督学习', slug: 'supervised-learning', summary: '带标签' }],
    }),
    getDifficulty: () => '0',
    setDifficulty: vi.fn(),
    getApiKey: () => 'sk-test',
    setApiKey: vi.fn(),
  }),
}))

vi.mock('../src/composables/usePath.js', () => ({
  usePath: () => ({
    learningPath: { value: [] },
    clearPath: vi.fn(),
    restoreFromStorage: vi.fn(),
  }),
}))

import { mount } from '@vue/test-utils'
import ConceptPage from '../src/components/ConceptPage.vue'

describe('ConceptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    threadTree = { root: [] }
    conceptCache = {}
    currentSlugVar = ''
  })

  it('renders empty state', () => {
    const wrapper = mount(ConceptPage)
    expect(wrapper.text()).toContain('开始你的知识探索')
  })

  it('renders tree sidebar', () => {
    const wrapper = mount(ConceptPage)
    expect(wrapper.text()).toContain('探索路径')
    expect(wrapper.findAll('aside').length).toBeGreaterThanOrEqual(1)
  })

  it('renders header', () => {
    const wrapper = mount(ConceptPage)
    expect(wrapper.text()).toContain('DeepDive')
  })

  it('has history button in header', () => {
    const wrapper = mount(ConceptPage)
    expect(wrapper.text()).toContain('历史')
    expect(wrapper.text()).toContain('新探索')
  })
})
