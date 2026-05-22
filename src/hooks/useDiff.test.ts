import { describe, it, expect } from 'vitest'
import { computeDiff } from './useDiff'

describe('computeDiff', () => {
  it('returns zero diffCount for identical text', () => {
    const result = computeDiff('hello\nworld\n', 'hello\nworld\n')
    expect(result.diffCount).toBe(0)
    expect(result.leftDecorations).toHaveLength(0)
    expect(result.rightDecorations).toHaveLength(0)
  })

  it('detects added lines on the right', () => {
    const result = computeDiff('hello\n', 'hello\nworld\n')
    expect(result.diffCount).toBe(1)
    expect(result.rightDecorations).toHaveLength(1)
    expect(result.leftDecorations).toHaveLength(0)
  })

  it('detects removed lines on the left', () => {
    const result = computeDiff('hello\nworld\n', 'hello\n')
    expect(result.diffCount).toBe(1)
    expect(result.leftDecorations).toHaveLength(1)
    expect(result.rightDecorations).toHaveLength(0)
  })

  it('detects changed lines on both sides', () => {
    const result = computeDiff('hello\n', 'world\n')
    expect(result.diffCount).toBe(1)
    expect(result.leftDecorations).toHaveLength(1)
    expect(result.rightDecorations).toHaveLength(1)
  })

  it('decoration range startLineNumber starts at 1', () => {
    const result = computeDiff('a\nb\n', 'a\nc\n')
    const dec = result.leftDecorations[0]
    expect(dec.range.startLineNumber).toBeGreaterThanOrEqual(1)
  })
})
