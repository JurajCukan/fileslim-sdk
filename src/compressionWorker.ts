/** Worker encoder for @fileslim/compress Best Algorithm mode. */

type EncodeModule = { encode: (data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer> | ArrayBuffer };
type OxipngModule = { optimise?: (buffer: ArrayBuffer, options?: Record<string, unknown>) => Promise<ArrayBuffer> | ArrayBuffer };

let jpegEncode: EncodeModule['encode'] | null = null;
let webpEncode: EncodeModule['encode'] | null = null;
let avifEncode: EncodeModule['encode'] | null = null;
let pngEncode: EncodeModule['encode'] | null = null;
let jxlEncode: EncodeModule['encode'] | null = null;
let oxipngOptimise: NonNullable<OxipngModule['optimise']> | null = null;

async function loadCodec(format: string) {
  switch (format) {
    case 'jpeg':
      if (!jpegEncode) jpegEncode = (await import('@jsquash/jpeg')).encode;
      return;
    case 'webp':
      if (!webpEncode) webpEncode = (await import('@jsquash/webp')).encode;
      return;
    case 'avif':
      if (!avifEncode) avifEncode = (await import('@jsquash/avif')).encode;
      return;
    case 'png':
      if (!pngEncode) pngEncode = (await import('@jsquash/png')).encode;
      if (!oxipngOptimise) {
        try {
          const mod = await import('@jsquash/oxipng');
          oxipngOptimise = mod.optimise;
        } catch {
          oxipngOptimise = null;
        }
      }
      return;
    case 'jxl':
      if (!jxlEncode) jxlEncode = (await import('@jsquash/jxl')).encode;
      return;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

async function encode(imageData: ImageData, format: string, quality: number): Promise<{ buffer: ArrayBuffer; actualFormat: string; badge?: string }> {
  await loadCodec(format);
  const q = Math.round(quality * 100);

  switch (format) {
    case 'jpeg': {
      const buffer = await jpegEncode!(imageData, { quality: q });
      return { buffer, actualFormat: 'jpeg' };
    }
    case 'webp': {
      const buffer = await webpEncode!(imageData, { quality: q });
      return { buffer, actualFormat: 'webp' };
    }
    case 'avif': {
      const avifPromise = avifEncode!(imageData, { quality: q, speed: 7 });
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AVIF_TIMEOUT')), 3000);
      });

      try {
        const buffer = await Promise.race([avifPromise, timeout]);
        return { buffer, actualFormat: 'avif' };
      } catch (error) {
        if (error instanceof Error && error.message === 'AVIF_TIMEOUT') {
          await loadCodec('webp');
          const buffer = await webpEncode!(imageData, { quality: q });
          return { buffer, actualFormat: 'webp', badge: 'Used WebP for speed' };
        }
        throw error;
      }
    }
    case 'png': {
      const rawPng = await pngEncode!(imageData);
      const optimised = oxipngOptimise ? await oxipngOptimise(rawPng, { level: 2 }) : rawPng;
      return { buffer: optimised, actualFormat: 'png' };
    }
    case 'jxl': {
      const buffer = await jxlEncode!(imageData, { quality: q, effort: 5 });
      return { buffer, actualFormat: 'jxl' };
    }
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, format, quality, width, height, buffer } = e.data;
  if (type !== 'encode') return;

  try {
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const start = performance.now();
    const result = await encode(imageData, format, quality);
    const elapsed = performance.now() - start;

    (self as any).postMessage(
      {
        type: 'result',
        id,
        format: result.actualFormat,
        buffer: result.buffer,
        size: result.buffer.byteLength,
        elapsed,
        badge: result.badge,
      },
      [result.buffer]
    );
  } catch (error) {
    (self as any).postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Encoding failed',
    });
  }
};
