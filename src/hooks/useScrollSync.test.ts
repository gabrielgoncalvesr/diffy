import { describe, it, expect, vi } from 'vitest'
import { syncScroll } from './useScrollSync'

describe('syncScroll', () => {
  it('does not throw when called with valid ratios', () => {
    const setScrollTop = vi.fn()
    expect(() => syncScroll(0.5, 1000, setScrollTop)).not.toThrow()
    expect(setScrollTop).toHaveBeenCalledWith(500)
  })

  it('clamps ratio to [0, 1]', () => {
    const setScrollTop = vi.fn()
    syncScroll(1.5, 1000, setScrollTop)
    expect(setScrollTop).toHaveBeenCalledWith(1000)
  })

  it('handles zero scrollHeight without throwing', () => {
    const setScrollTop = vi.fn()
    expect(() => syncScroll(0.5, 0, setScrollTop)).not.toThrow()
    expect(setScrollTop).not.toHaveBeenCalled()
  })
})
