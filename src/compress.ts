/**
 * @fileslim/compress - Image Compression
 * Hybrid compression: @jsquash encoders with browser-image-compression fallback
 */

import type { CompressOptions, CompressedFile, ImageFormat } from './types';
import { PRESETS } from './presets';
import { replaceExtension, calculateSavings, getMimeType, detectBestFormat, loadImageData, calculateSSIM, getSSIMRating } from './utils';

/**
 * Try encoding with @jsquash for superior quality-per-byte.
 * Returns null if @jsquash is not installed (peer dep).
 */
async function tryJsquashEncode(
  file: File,
  format: ImageFormat,
  quality: number,
  maxWidth: number | null
): Promise<Blob | null> {
  try {
    const img = await createImageBitmap(file);
    
    let targetWidth = img.width;
    let targetHeight = img.height;
    
    if (maxWidth && targetWidth > maxWidth) {
      const scale = maxWidth / targetWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(img.height * scale);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    img.close();
    
    const qualityInt = Math.round(quality * 100);
    let encoded: ArrayBuffer;
    
    switch (format) {
      case 'avif': {
        const { encode } = await import('@jsquash/avif');
        encoded = await encode(imageData, { quality: qualityInt });
        break;
      }
      case 'jpeg': {
        const { encode } = await import('@jsquash/jpeg');
        encoded = await encode(imageData, { quality: qualityInt });
        break;
      }
      case 'png': {
        const { encode } = await import('@jsquash/png');
        encoded = await encode(imageData);
        break;
      }
      default:
        return null;
    }
    
    return new Blob([new Uint8Array(encoded)], { type: getMimeType(format) });
  } catch {
    return null;
  }
}

/**
 * Fallback compression using browser-image-compression
 */
async function fallbackCompress(
  file: File,
  format: ImageFormat,
  quality: number,
  maxWidth: number | null
): Promise<Blob> {
  const imageCompression = (await import('browser-image-compression')).default;
  
  const compressionOptions = {
    maxSizeMB: Math.max(0.1, (file.size / (1024 * 1024)) * quality),
    maxWidthOrHeight: maxWidth ?? undefined,
    useWebWorker: true,
    fileType: getMimeType(format),
    initialQuality: quality,
    alwaysKeepResolution: maxWidth === null,
  };
  
  return await imageCompression(file, compressionOptions);
}

/**
 * Compress an image file
 * 
 * Uses @jsquash encoders (AVIF, JPEG, PNG) when available for best quality-per-byte,
 * falls back to browser-image-compression otherwise.
 * 
 * @example
 * const result = await compress(file);
 * console.log(`Saved ${result.savings}%`);
 * 
 * @example
 * const result = await compress(file, {
 *   format: 'avif',
 *   quality: 0.75,
 *   measureQuality: true
 * });
 * console.log(result.qualityScore?.rating);
 * 
 * @example
 * const result = await compress(file, { preset: 'web' });
 */
export async function compress(
  file: File,
  options?: CompressOptions
): Promise<CompressedFile> {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid input: expected a File object');
  }
  
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Expected an image file.`);
  }

  const preset = options?.preset ? PRESETS[options.preset] : null;
  
  const quality = options?.quality ?? preset?.quality ?? 0.8;
  const maxWidth = options?.maxWidth ?? preset?.maxWidth ?? 1920;
  const requestedFormat = options?.format ?? preset?.format ?? 'webp';
  const measureQuality = options?.measureQuality ?? false;
  
  const format: ImageFormat = requestedFormat === 'auto' 
    ? detectBestFormat(file) 
    : requestedFormat;

  if (quality < 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1');
  }

  try {
    let compressedBlob: Blob;
    
    const jsquashResult = await tryJsquashEncode(file, format, quality, maxWidth);
    
    if (jsquashResult) {
      compressedBlob = jsquashResult;
    } else {
      compressedBlob = await fallbackCompress(file, format, quality, maxWidth);
    }
    
    const result: CompressedFile = {
      blob: compressedBlob,
      filename: replaceExtension(file.name, format),
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      savings: calculateSavings(file.size, compressedBlob.size),
      format: getMimeType(format)
    };

    if (compressedBlob.size >= file.size) {
      return {
        ...result,
        blob: file,
        compressedSize: file.size,
        savings: 0,
        format: file.type,
        filename: file.name
      };
    }

    if (measureQuality) {
      try {
        const [originalData, compressedData] = await Promise.all([
          loadImageData(file),
          loadImageData(compressedBlob)
        ]);
        const ssim = calculateSSIM(originalData, compressedData);
        result.qualityScore = {
          ssim: Math.round(ssim * 1000) / 1000,
          rating: getSSIMRating(ssim)
        };
      } catch {
        // SSIM measurement failed — skip silently
      }
    }

    return result;
  } catch (error) {
    throw new Error(
      `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
