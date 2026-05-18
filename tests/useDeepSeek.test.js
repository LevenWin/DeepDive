import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDeepSeek } from '../src/composables/useDeepSeek.js'

describe('useDeepSeek', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getApiKey / setApiKey', () => {
    it('returns empty string when no key is set', () => {
      const { getApiKey } = useDeepSeek()
      expect(getApiKey()).toBe('')
    })

    it('stores and retrieves API key', () => {
      const { setApiKey, getApiKey } = useDeepSeek()
      setApiKey('sk-test-key')
      expect(getApiKey()).toBe('sk-test-key')
      expect(localStorage.getItem('apiKey')).toBe('sk-test-key')
    })
  })

  describe('getDifficulty / setDifficulty', () => {
    it('defaults to 通俗 when not set', () => {
      const { getDifficulty } = useDeepSeek()
      expect(getDifficulty()).toBe('通俗')
    })

    it('stores and retrieves difficulty', () => {
      const { setDifficulty, getDifficulty } = useDeepSeek()
      setDifficulty('学术')
      expect(getDifficulty()).toBe('学术')
    })
  })

  describe('getLearningPath', () => {
    it('returns empty array when no path stored', () => {
      const { getLearningPath } = useDeepSeek()
      expect(getLearningPath()).toEqual([])
    })

    it('returns parsed path from localStorage', () => {
      localStorage.setItem('learningPath', JSON.stringify([{ slug: 'ml', title: '机器学习' }]))
      const { getLearningPath } = useDeepSeek()
      expect(getLearningPath()).toEqual([{ slug: 'ml', title: '机器学习' }])
    })

    it('returns empty array on invalid JSON', () => {
      localStorage.setItem('learningPath', '{invalid')
      const { getLearningPath } = useDeepSeek()
      expect(getLearningPath()).toEqual([])
    })
  })

  describe('fetchConcept', () => {
    it('throws API_KEY_MISSING when no key set', async () => {
      const { fetchConcept } = useDeepSeek()
      await expect(fetchConcept('Kafka')).rejects.toThrow('API_KEY_MISSING')
    })

    it('calls DeepSeek API with correct payload', async () => {
      localStorage.setItem('apiKey', 'sk-test')
      localStorage.setItem('learningPath', JSON.stringify([{ slug: 'ml', title: '机器学习' }]))

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: '## Kafka 解释\n\nKafka 是分布式消息系统。\n\n---CONCEPTS---\n[{"term":"Broker","slug":"broker","summary":"消息节点"}]'
            }
          }]
        })
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { fetchConcept } = useDeepSeek()
      const result = await fetchConcept('Kafka')

      expect(result.title).toBe('Kafka')
      expect(result.slug).toBe('kafka')
      expect(result.content).toContain('Kafka 解释')
      expect(result.relatedConcepts).toHaveLength(1)
      expect(result.relatedConcepts[0].term).toBe('Broker')

      const callArgs = global.fetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.model).toBe('deepseek-v4-pro')
      expect(body.messages[1].content).toBe('概念：Kafka')
      expect(body.messages[0].content).toContain('机器学习')
    })

    it('handles API error response', async () => {
      localStorage.setItem('apiKey', 'sk-test')

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API Key' } })
      })

      const { fetchConcept } = useDeepSeek()
      await expect(fetchConcept('Test')).rejects.toThrow('Invalid API Key')
    })
  })
})
