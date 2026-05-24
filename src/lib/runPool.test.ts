import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runPool } from './runPool'

describe('runPool', () => {
  it('returns empty array for empty input without calling the worker', async () => {
    const worker = vi.fn()
    const result = await runPool([], worker, { concurrency: 5 })
    expect(result).toEqual([])
    expect(worker).not.toHaveBeenCalled()
  })

  it('processes all items and preserves result order', async () => {
    const items = [1, 2, 3, 4, 5]
    const result = await runPool(items, async (x) => x * 2, { concurrency: 3 })
    expect(result).toEqual([2, 4, 6, 8, 10])
  })

  it('respects concurrency limit', async () => {
    let maxConcurrent = 0
    let current = 0
    const items = Array.from({ length: 10 }, (_, i) => i)

    await runPool(
      items,
      async () => {
        current++
        maxConcurrent = Math.max(maxConcurrent, current)
        await new Promise((r) => setTimeout(r, 5))
        current--
        return null
      },
      { concurrency: 3 },
    )

    expect(maxConcurrent).toBeLessThanOrEqual(3)
    expect(maxConcurrent).toBeGreaterThan(1)
  })

  it('calls onProgress once per completed item with the index and result', async () => {
    const onProgress = vi.fn()
    const items = [10, 20, 30]
    await runPool(items, async (x) => x + 1, { concurrency: 2, onProgress })
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenCalledWith(0, 11)
    expect(onProgress).toHaveBeenCalledWith(1, 21)
    expect(onProgress).toHaveBeenCalledWith(2, 31)
  })

  it('stops processing new items after abort signal fires', async () => {
    const controller = new AbortController()
    const processed: number[] = []
    const items = Array.from({ length: 10 }, (_, i) => i)

    await runPool(
      items,
      async (x) => {
        processed.push(x)
        if (x === 2) controller.abort()
        return x
      },
      { concurrency: 1, signal: controller.signal },
    )

    // concurrency=1 means sequential; abort fires during item 2,
    // so item 3 onward are skipped
    expect(processed.length).toBeLessThan(10)
    expect(processed).not.toContain(9)
  })

  it('handles concurrency higher than item count', async () => {
    const items = [1, 2]
    const result = await runPool(items, async (x) => x * 10, { concurrency: 100 })
    expect(result).toEqual([10, 20])
  })
})
