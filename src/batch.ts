/**
 * @fileslim/compress - Batch Compression
 * Process multiple files with progress tracking
 */

import type { BatchOptions, CompressedFile, BatchResult } from './types';
import { compress } from './compress';
import { compressPDF } from './pdf';
import { isImageFile, isPDFFile } from './utils';

/**
 * Compress multiple files with progress tracking
 * 
 * @example
 * // Basic batch compression
 * const results = await compressBatch(files);
 * 
 * @example
 * // With progress callback
 * const results = await compressBatch(files, {
 *   preset: 'web',
 *   onProgress: (current, total) => {
 *     console.log(`Processing ${current}/${total}`);
 *   }
 * });
 * 
 * @example
 * // Continue on errors
 * const { results, errors } = await compressBatch(files, {
 *   continueOnError: true
 * });
 */
export async function compressBatch(
  files: File[],
  options?: BatchOptions
): Promise<BatchResult> {
  // Validate input
  if (!Array.isArray(files)) {
    throw new Error('Invalid input: expected an array of Files');
  }

  if (files.length === 0) {
    return { results: [], errors: [] };
  }

  const results: CompressedFile[] = [];
  const errors: Array<{ file: File; error: Error }> = [];
  const continueOnError = options?.continueOnError ?? false;
  const onProgress = options?.onProgress;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, files.length);
    }

    try {
      let result: CompressedFile;

      if (isPDFFile(file)) {
        // Compress as PDF
        result = await compressPDF(file, {
          mode: 'balanced',
          imageQuality: options?.quality
        });
      } else if (isImageFile(file)) {
        // Compress as image
        result = await compress(file, {
          quality: options?.quality,
          maxWidth: options?.maxWidth,
          format: options?.format,
          preset: options?.preset
        });
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      results.push(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (continueOnError) {
        errors.push({ file, error: err });
      } else {
        throw err;
      }
    }
  }

  return { results, errors };
}
