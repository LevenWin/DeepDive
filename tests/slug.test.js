import { describe, it, expect } from 'vitest'
import { generateSlug } from '../src/utils/slug.js'

describe('generateSlug', () => {
  it('converts title to lowercase slug', () => {
    expect(generateSlug('Kafka')).toBe('kafka')
  })

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('Machine Learning')).toBe('machine-learning')
  })

  it('removes special characters', () => {
    expect(generateSlug('C# Programming')).toBe('c-programming')
  })

  it('handles Chinese characters by removing them', () => {
    expect(generateSlug('支持向量机SVM')).toBe('svm')
  })

  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('--hello--')).toBe('hello')
  })

  it('handles empty string', () => {
    const slug = generateSlug('')
    expect(slug).toBeTruthy()
    expect(slug).toMatch(/^id-/)
  })

  it('handles underscores as spaces', () => {
    expect(generateSlug('transformer_model')).toBe('transformer-model')
  })
})
