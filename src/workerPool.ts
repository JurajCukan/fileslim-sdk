/**
 * SDK worker pool for parallel image encoding.
 * Temporary build-safe version for SDK publishing:
 * runs on the main thread and preserves the same public API.
 */

export interface EncodeRequest {
  format: string;
  quality: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface EncodeResult {
  format: string;
  buffer: ArrayBuffer;
  size: number;
  elapsed: number;
  badge?: string;
}

export class CompressionWorkerPool {
  // No configuration needed in the main-thread fallback implementation.
  constructor() {}

  private isMemoryPressureHigh(): boolean {
    const memory = (globalThis.performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    })?.memory;

    if (!memory) return false;
    return memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8;
  }

  async encode(req: EncodeRequest): Promise<EncodeResult> {
    const start = performance.now();
    const { encode } = await import('./compressionWorker');
    const result = await encode(req);
    const elapsed =
      typeof (result as any).elapsed === 'number'
        ? (result as any).elapsed
        : performance.now() - start;

    return {
      ...result,
      elapsed
    };
  }

  async encodeParallel(
    formats: Array<{ format: string; quality: number }>,
    width: number,
    height: number,
    rgbaBuffer: ArrayBuffer
  ): Promise<EncodeResult[]> {
    const sequential = this.isMemoryPressureHigh();
    const results: EncodeResult[] = [];

    if (sequential) {
      for (const format of formats) {
        try {
          results.push(
            await this.encode({
              ...format,
              width,
              height,
              buffer: rgbaBuffer.slice(0)
            })
          );
        } catch {
          // Ignore failed codec and continue.
        }
      }
      return results;
    }

    const settled = await Promise.allSettled(
      formats.map((format) =>
        this.encode({
          ...format,
          width,
          height,
          buffer: rgbaBuffer.slice(0)
        })
      )
    );

    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.push(item.value);
      }
    }

    return results;
  }

  terminate() {
    // No-op in main-thread fallback mode.
  }
}

let sharedPool: CompressionWorkerPool | null = null;

export function getWorkerPool() {
  if (!sharedPool) sharedPool = new CompressionWorkerPool();
  return sharedPool;
}

export function terminateWorkerPool() {
  sharedPool?.terminate();
  sharedPool = null;
}