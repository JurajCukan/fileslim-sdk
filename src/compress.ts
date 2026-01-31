/**
 * @fileslim/compress - Image Compression
 * Core image compression logic using browser-image-compression
 */

import type { CompressOptions, CompressedFile, ImageFormat } from './types';
import { PRESETS } from './presets';
import { replaceExtension, calculateSavings, getMimeType, detectBestFormat } from './utils';

/**
 * Compress an image file
 * 
 * @example
 * // Basic usage - compress with defaults
 * const result = await compress(file);
 * console.log(`Saved ${result.savings}%`);
 * 
 * @example
 * // With preset
 * const result = await compress(file, { preset: 'web' });
 * 
 * @example
 * // With custom options
 * const result = await compress(file, {
 *   quality: 0.8,
 *   maxWidth: 1920,
 *   format: 'webp'
 * });
 */
export async function compress(
  file: File,
  options?: CompressOptions
): Promise<CompressedFile> {
  // Validate input
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid input: expected a File object');
  }
  
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Expected an image file.`);
  }

  // Dynamically import browser-image-compression for tree-shaking
  const imageCompression = (await import('browser-image-compression')).default;

  // Get preset config if specified
  const preset = options?.preset ? PRESETS[options.preset] : null;
  
  // Resolve options with priority: explicit options > preset > defaults
  const quality = options?.quality ?? preset?.quality ?? 0.8;
  const maxWidth = options?.maxWidth ?? preset?.maxWidth ?? 1920;
  const requestedFormat = options?.format ?? preset?.format ?? 'webp';
  
  // Determine actual format
  const format: ImageFormat = requestedFormat === 'auto' 
    ? detectBestFormat(file) 
    : requestedFormat;

  // Validate quality
  if (quality < 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1');
  }

  // Compression options for browser-image-compression
  const compressionOptions = {
    maxSizeMB: 10, // High limit - quality controls actual size
    maxWidthOrHeight: maxWidth ?? undefined,
    useWebWorker: true,
    fileType: getMimeType(format),
    initialQuality: quality,
    alwaysKeepResolution: maxWidth === null,
  };

  try {
    // Perform compression
    const compressedBlob = await imageCompression(file, compressionOptions);
    
    // Build result
    const result: CompressedFile = {
      blob: compressedBlob,
      filename: replaceExtension(file.name, format),
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      savings: calculateSavings(file.size, compressedBlob.size),
      format: getMimeType(format)
    };

    // If compressed is larger, return original
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

    return result;
  } catch (error) {
    throw new Error(
      `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
