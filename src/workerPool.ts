/**
 * SDK worker pool for parallel image encoding.
 * Mirrors the web app Best Algorithm engine while staying SDK-safe.
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

interface PendingTask {
  resolve: (result: EncodeResult) => void;
  reject: (error: Error) => void;
}

let idCounter = 0;
const nextId = () => `sdk_enc_${++idCounter}_${Date.now()}`;

export class CompressionWorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<string, PendingTask>();
  private roundRobin = 0;
  private initialised = false;

  constructor(private readonly poolSize = Math.max(1, ((globalThis.navigator?.hardwareConcurrency || 2) - 1))) {}

  private init() {
    if (this.initialised) return;
    this.initialised = true;

    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not available in this environment');
    }

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(new URL('./compressionWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (e: MessageEvent) => {
        const { type, id, format, buffer, size, elapsed, badge, error } = e.data;
        const task = this.pending.get(id);
        if (!task) return;
        this.pending.delete(id);

        if (type === 'result') {
          task.resolve({ format, buffer, size, elapsed, badge });
        } else {
          task.reject(new Error(error || 'Worker encoding failed'));
        }
      };

      worker.onerror = (event) => {
        for (const [id, task] of this.pending) {
          this.pending.delete(id);
          task.reject(new Error(event.message || 'Worker failed'));
        }
      };

      this.workers.push(worker);
    }
  }

  private getWorker(): Worker {
    this.init();
    const worker = this.workers[this.roundRobin % this.workers.length];
    this.roundRobin++;
    return worker;
  }

  encode(req: EncodeRequest): Promise<EncodeResult> {
    const id = nextId();
    const worker = this.getWorker();

    return new Promise<EncodeResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage(
        {
          type: 'encode',
          id,
          format: req.format,
          quality: req.quality,
          width: req.width,
          height: req.height,
          buffer: req.buffer,
        },
        [req.buffer]
      );
    });
  }

  private isMemoryPressureHigh(): boolean {
    const memory = (globalThis.performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })?.memory;
    if (!memory) return false;
    return memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8;
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
          results.push(await this.encode({ ...format, width, height, buffer: rgbaBuffer.slice(0) }));
        } catch {
          // Ignore failed codec and continue with remaining candidates.
        }
      }
      return results;
    }

    const settled = await Promise.allSettled(
      formats.map((format) => this.encode({ ...format, width, height, buffer: rgbaBuffer.slice(0) }))
    );

    for (const item of settled) {
      if (item.status === 'fulfilled') results.push(item.value);
    }

    return results;
  }

  terminate() {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    this.pending.clear();
    this.initialised = false;
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
