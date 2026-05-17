export type RunPoolOptions<R> = {
  concurrency: number
  signal?: AbortSignal
  onProgress?: (index: number, result: R) => void
}

export async function runPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  options: RunPoolOptions<R>,
): Promise<(R | undefined)[]> {
  const results: (R | undefined)[] = new Array(items.length)
  if (items.length === 0) return results

  const { concurrency, signal, onProgress } = options
  const runnerCount = Math.max(1, Math.min(concurrency, items.length))
  let cursor = 0

  const runner = async () => {
    while (true) {
      if (signal?.aborted) return
      const i = cursor++
      if (i >= items.length) return
      const result = await worker(items[i], i)
      results[i] = result
      onProgress?.(i, result)
    }
  }

  await Promise.all(Array.from({ length: runnerCount }, runner))
  return results
}
