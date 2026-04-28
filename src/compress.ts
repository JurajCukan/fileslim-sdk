/**
 * @fileslim/compress - Image Compression
 * Hybrid standard compression plus app-matching Best Algorithm worker-pool mode.
 */

import type { CompressOptions, CompressedFile, ImageFormat, CompressionProgressEvent } from './types';
import { PRESETS } from './presets';
import {
  replaceExtension,
  calculateSavings,
  getMimeType,
  detectBestFormat,
  loadImageData,
  calculateSSIM,
  getSSIMRating,
  supportsAVIF,
} from './utils';
import { getWorkerPool, type EncodeResult } from './workerPool';

interface ResolvedOptions {
  quality: number;
  maxWidth: number | null;
  format: ImageFormat;
  stripMetadata: boolean;
  measureQuality: boolean;
  useBestAlgorithm: boolean;
  minSSIM: number;
  testAllFormats: boolean;
  onProgress?: (event: CompressionProgressEvent) => void;
}

interface ImageAnalysis {
  hasTransparency: boolean;
  imageType: 'photo' | 'graphic' | 'text' | 'mixed';
  colorCount: 'few' | 'moderate' | 'many';
  edgeIntensity: 'low' | 'medium' | 'high';
}

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
  jxl: 'image/jxl',
};

const FORMAT_LABEL: Record<string, string> = {
  jpeg: 'JPEG (MozJPEG)',
  webp: 'WebP',
  avif: 'AVIF',
  png: 'PNG (OxiPNG)',
  jxl: 'JPEG XL',
};

const emit = (options: ResolvedOptions, event: CompressionProgressEvent) => {
  options.onProgress?.(event);
};

function supportsJXL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    if (canvas.toDataURL('image/jxl').startsWith('data:image/jxl')) return true;
  } catch {
    // Continue with Safari UA check below.
  }

  const ua = globalThis.navigator?.userAgent || '';
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const version = ua.match(/Version\/(\d+)/);
    if (version && Number.parseInt(version[1], 10) >= 17) return true;
  }

  return false;
}

async function analyzeImage(file: File): Promise<ImageAnalysis> {
  const image = new Image();
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load image for analysis'));
    image.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Canvas not supported');
  }

  ctx.drawImage(image, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;
  URL.revokeObjectURL(url);

  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      hasTransparency = true;
      break;
    }
  }

  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    colors.add(`${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`);
  }

  const colorCount = colors.size < 100 ? 'few' : colors.size < 300 ? 'moderate' : 'many';

  let edgeSum = 0;
  for (let y = 1; y < 63; y++) {
    for (let x = 1; x < 63; x++) {
      const idx = (y * 64 + x) * 4;
      const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
      const down = 0.299 * data[idx + 256] + 0.587 * data[idx + 257] + 0.114 * data[idx + 258];
      edgeSum += Math.abs(right - center) + Math.abs(down - center);
    }
  }

  const avgEdge = edgeSum / (62 * 62);
  const edgeIntensity = avgEdge < 10 ? 'low' : avgEdge < 25 ? 'medium' : 'high';

  let imageType: ImageAnalysis['imageType'] = 'mixed';
  if (edgeIntensity === 'high' && colorCount === 'few') imageType = 'text';
  else if (edgeIntensity === 'low' && colorCount === 'many') imageType = 'photo';
  else if (colorCount === 'few') imageType = 'graphic';
  else if (edgeIntensity === 'medium' && colorCount === 'many') imageType = 'photo';

  return { hasTransparency, imageType, colorCount, edgeIntensity };
}

async function decodeFileToImageData(file: File, maxWidth: number | null): Promise<{ imageData: ImageData; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (maxWidth && width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas not supported');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return { imageData: ctx.getImageData(0, 0, width, height), width, height };
}

function selectFormats(analysis: ImageAnalysis, testAll: boolean): Array<{ format: string; quality: number }> {
  if (testAll) {
    const formats = [
      { format: 'jpeg', quality: 0.8 },
      { format: 'webp', quality: 0.8 },
    ];
    if (supportsAVIF()) formats.push({ format: 'avif', quality: 0.75 });
    if (supportsJXL()) formats.push({ format: 'jxl', quality: 0.8 });
    if (analysis.hasTransparency) formats.push({ format: 'png', quality: 1 });
    return formats;
  }

  if (analysis.hasTransparency) {
    return [
      { format: 'webp', quality: 0.8 },
      { format: 'png', quality: 1 },
    ];
  }

  if (analysis.imageType === 'photo') {
    const formats = [
      { format: 'jpeg', quality: 0.8 },
      { format: 'webp', quality: 0.8 },
    ];
    if (supportsAVIF()) formats.push({ format: 'avif', quality: 0.75 });
    if (supportsJXL()) formats.push({ format: 'jxl', quality: 0.8 });
    return formats;
  }

  if (analysis.imageType === 'graphic' || analysis.imageType === 'text') {
    return [
      { format: 'png', quality: 1 },
      { format: 'webp', quality: 0.85 },
    ];
  }

  return [
    { format: 'webp', quality: 0.8 },
    { format: 'jpeg', quality: 0.8 },
  ];
}

async function encodeSingleThread(file: File, format: string, quality: number, maxWidth: number | null): Promise<Blob | null> {
  try {
    const { imageData } = await decodeFileToImageData(file, maxWidth);
    const qualityInt = Math.round(quality * 100);
    let encoded: ArrayBuffer;

    switch (format) {
      case 'avif':
        encoded = await (await import('@jsquash/avif')).encode(imageData, { quality: qualityInt, speed: 7 });
        break;
      case 'jpeg':
        encoded = await (await import('@jsquash/jpeg')).encode(imageData, { quality: qualityInt });
        break;
      case 'webp':
        encoded = await (await import('@jsquash/webp')).encode(imageData, { quality: qualityInt });
        break;
      case 'png': {
        const rawPng = await (await import('@jsquash/png')).encode(imageData);
        try {
          encoded = await (await import('@jsquash/oxipng')).optimise(rawPng, { level: 2 });
        } catch {
          encoded = rawPng;
        }
        break;
      }
      case 'jxl':
        encoded = await (await import('@jsquash/jxl')).encode(imageData, { quality: qualityInt, effort: 5 });
        break;
      default:
        return null;
    }

    return new Blob([new Uint8Array(encoded)], { type: FORMAT_MIME[format] || getMimeType(format) });
  } catch {
    return null;
  }
}

async function tryJsquashEncode(file: File, format: ImageFormat, quality: number, maxWidth: number | null): Promise<Blob | null> {
  if (format === 'auto') return null;
  return encodeSingleThread(file, format, quality, maxWidth);
}

async function fallbackCompress(file: File, format: ImageFormat, quality: number, maxWidth: number | null): Promise<Blob> {
  const imageCompression = (await import('browser-image-compression')).default;

  return await imageCompression(file, {
    maxSizeMB: Math.max(0.1, (file.size / (1024 * 1024)) * quality),
    maxWidthOrHeight: maxWidth ?? undefined,
    useWebWorker: true,
    fileType: getMimeType(format),
    initialQuality: quality,
    alwaysKeepResolution: maxWidth === null,
  });
}

async function measureQuality(original: File, compressed: Blob) {
  const [originalData, compressedData] = await Promise.all([
    loadImageData(original),
    loadImageData(compressed),
  ]);
  const ssim = calculateSSIM(originalData, compressedData);
  return {
    ssim: Math.round(ssim * 1000) / 1000,
    rating: getSSIMRating(ssim),
  };
}

async function compressStandard(file: File, options: ResolvedOptions): Promise<CompressedFile> {
  const format: ImageFormat = options.format === 'auto' ? detectBestFormat(file) : options.format;
  let compressedBlob = await tryJsquashEncode(file, format, options.quality, options.maxWidth);

  if (!compressedBlob) {
    compressedBlob = await fallbackCompress(file, format, options.quality, options.maxWidth);
  }

  const useOriginal = compressedBlob.size >= file.size;
  const resultBlob = useOriginal ? file : compressedBlob;
  const resultFormat = useOriginal ? file.type : getMimeType(format);
  const resultFilename = useOriginal ? file.name : replaceExtension(file.name, format);

  const result: CompressedFile = {
    blob: resultBlob,
    filename: resultFilename,
    originalSize: file.size,
    compressedSize: resultBlob.size,
    savings: calculateSavings(file.size, resultBlob.size),
    format: resultFormat,
  };

  if (options.measureQuality && !useOriginal) {
    try {
      result.qualityScore = await measureQuality(file, resultBlob);
    } catch {
      // Quality measurement is optional; compression result remains valid.
    }
  }

  return result;
}

async function compressBest(file: File, options: ResolvedOptions): Promise<CompressedFile> {
  emit(options, { phase: 'analysis', message: 'Analyzing image...', algorithm: 'analysis', status: 'testing' });
  const analysis = await analyzeImage(file);
  const selectedFormats = selectFormats(analysis, options.testAllFormats);
  const jobFormats = selectedFormats.map((candidate) => ({
    format: candidate.format,
    quality: candidate.format === 'png' ? 1 : options.quality,
  }));

  emit(options, {
    phase: 'encoding',
    message: `Testing ${jobFormats.map((candidate) => candidate.format).join(', ')} in parallel...`,
    algorithm: 'analysis',
    status: 'testing',
  });

  const { imageData, width, height } = await decodeFileToImageData(file, options.maxWidth);
  let results: EncodeResult[] = [];

  try {
    results = await getWorkerPool().encodeParallel(jobFormats, width, height, imageData.data.buffer as ArrayBuffer);
  } catch {
    emit(options, { phase: 'fallback', message: 'Worker pool unavailable, using single-thread fallback', status: 'fallback' });
  }

  if (results.length === 0) {
    for (const candidate of jobFormats) {
      const blob = await encodeSingleThread(file, candidate.format, candidate.quality, options.maxWidth);
      if (blob) {
        results.push({
          format: candidate.format,
          buffer: await blob.arrayBuffer(),
          size: blob.size,
          elapsed: 0,
        });
      }
    }
  }

  for (const result of results) {
    const label = FORMAT_LABEL[result.format] || result.format;
    emit(options, {
      phase: 'candidate',
      message: `${label}: ${(result.size / 1024).toFixed(1)}KB${result.badge ? ` — ${result.badge}` : ''}`,
      algorithm: label,
      status: 'success',
      size: result.size,
      elapsed: result.elapsed,
    });
  }

  if (results.length === 0) {
    return compressStandard(file, options);
  }

  results.sort((a, b) => a.size - b.size);

  let selected = results[0];
  let selectedBlob = new Blob([selected.buffer.slice(0)], { type: FORMAT_MIME[selected.format] || 'application/octet-stream' });
  let qualityScore: CompressedFile['qualityScore'] | undefined;

  if (options.measureQuality) {
    try {
      qualityScore = await measureQuality(file, selectedBlob);
      emit(options, {
        phase: 'quality',
        message: `SSIM: ${(qualityScore.ssim * 100).toFixed(1)}%`,
        algorithm: FORMAT_LABEL[selected.format] || selected.format,
        status: 'success',
        size: selected.size,
        ssim: qualityScore.ssim,
      });

      if (qualityScore.ssim < options.minSSIM && results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          const candidate = results[i];
          const candidateBlob = new Blob([candidate.buffer.slice(0)], { type: FORMAT_MIME[candidate.format] });
          const candidateScore = await measureQuality(file, candidateBlob);

          if (candidateScore.ssim >= options.minSSIM) {
            selected = candidate;
            selectedBlob = candidateBlob;
            qualityScore = candidateScore;
            emit(options, {
              phase: 'selection',
              message: `Switched to ${FORMAT_LABEL[candidate.format] || candidate.format} for better quality`,
              algorithm: FORMAT_LABEL[candidate.format] || candidate.format,
              status: 'success',
              size: candidate.size,
              ssim: candidateScore.ssim,
            });
            break;
          }
        }
      }
    } catch {
      // SSIM is optional; keep smallest selected candidate if measurement fails.
    }
  }

  const savings = calculateSavings(file.size, selectedBlob.size);
  emit(options, {
    phase: 'selection',
    message: `${FORMAT_LABEL[selected.format] || selected.format} was ${savings}% smaller than your original`,
    algorithm: FORMAT_LABEL[selected.format] || selected.format,
    status: 'success',
    size: selectedBlob.size,
    ssim: qualityScore?.ssim,
  });

  if (selectedBlob.size >= file.size) {
    return {
      blob: file,
      filename: file.name,
      originalSize: file.size,
      compressedSize: file.size,
      savings: 0,
      format: file.type,
      qualityScore,
    };
  }

  return {
    blob: selectedBlob,
    filename: replaceExtension(file.name, selected.format),
    originalSize: file.size,
    compressedSize: selectedBlob.size,
    savings,
    format: FORMAT_MIME[selected.format] || selectedBlob.type,
    qualityScore,
  };
}

function resolveOptions(options?: CompressOptions): ResolvedOptions {
  const preset = options?.preset ? PRESETS[options.preset] : null;
  const quality = options?.quality ?? preset?.quality ?? 0.8;

  if (quality < 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1');
  }

  return {
    quality,
    maxWidth: options?.maxWidth ?? preset?.maxWidth ?? 1920,
    format: options?.format ?? preset?.format ?? 'webp',
    stripMetadata: options?.stripMetadata ?? true,
    measureQuality: options?.measureQuality ?? false,
    useBestAlgorithm: options?.mode === 'best' || options?.useBestAlgorithm === true,
    minSSIM: options?.minSSIM ?? 0.9,
    testAllFormats: options?.testAllFormats ?? false,
    onProgress: typeof options?.onProgress === 'function' ? options.onProgress as (event: CompressionProgressEvent) => void : undefined,
  };
}

/**
 * Compress an image file.
 *
 * Standard mode uses @jsquash encoders with browser-image-compression fallback.
 * Best mode mirrors FileSlim's web app: parallel worker-pool encoding, smart
 * candidate format selection, and optional SSIM-threshold quality selection.
 */
export async function compress(file: File, options?: CompressOptions): Promise<CompressedFile> {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid input: expected a File object');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Expected an image file.`);
  }

  const resolved = resolveOptions(options);

  try {
    return resolved.useBestAlgorithm ? await compressBest(file, resolved) : await compressStandard(file, resolved);
  } catch (error) {
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
