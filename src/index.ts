/**
 * @fileslim/compress
 * Client-side image and PDF compression. Zero servers, complete privacy.
 * 
 * @example
 * import { compress, compressPDF, compressBatch } from '@fileslim/compress';
 * 
 * // Compress an image
 * const result = await compress(file);
 * console.log(`Saved ${result.savings}%`);
 * 
 * // Compress a PDF
 * const pdf = await compressPDF(pdfFile);
 * 
 * // Batch compress multiple files
 * const results = await compressBatch(files, {
 *   preset: 'web',
 *   onProgress: (i, total) => console.log(`${i}/${total}`)
 * });
 * 
 * @packageDocumentation
 */

// Main compression functions
export { compress } from './compress';
export { compressPDF } from './pdf';
export { compressBatch } from './batch';

// Presets for quick configuration
export { PRESETS, PDF_MODES } from './presets';

// Utility functions
export { formatSize, calculateSavings } from './utils';

// Type exports
export type {
  CompressOptions,
  PDFOptions,
  BatchOptions,
  CompressedFile,
  BatchResult,
  ImageFormat,
  PresetName,
  PDFMode,
  PresetConfig
} from './types';
