/**
 * @fileslim/compress - Batch Compression
 * Process multiple files with progress tracking
 */

import type { BatchOptions, CompressedFile, BatchResult, CompressionProgressEvent } from './types';
import { compress } from './compress';
import { compressPDF } from './pdf';
import { isImageFile, isPDFFile } from './utils';

/**
 * Compress multiple files with progress tracking.
 *
 * Image files support the same standard and Best Algorithm options as compress().
 */
export async function compressBatch(files: File[], options?: BatchOptions): Promise<BatchResult> {
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

    if (onProgress) {
      (onProgress as (current: number, total: number) => void)(i + 1, files.length);
    }

    try {
      let result: CompressedFile;

      if (isPDFFile(file)) {
        result = await compressPDF(file, {
          mode: 'balanced',
          imageQuality: options?.quality,
        });
      } else if (isImageFile(file)) {
        result = await compress(file, {
          quality: options?.quality,
          maxWidth: options?.maxWidth,
          format: options?.format,
          preset: options?.preset,
          stripMetadata: options?.stripMetadata,
          measureQuality: options?.measureQuality,
          mode: options?.mode,
          useBestAlgorithm: options?.useBestAlgorithm,
          minSSIM: options?.minSSIM,
          testAllFormats: options?.testAllFormats,
          onProgress: options?.onFileProgress
            ? (event: CompressionProgressEvent) => options.onFileProgress?.(file, event)
            : undefined,
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
