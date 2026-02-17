/**
 * @fileslim/compress
 * Client-side image and PDF compression. Zero servers, complete privacy.
 * 
 * @example
 * import { compress, compressPDF, compressBatch } from '@fileslim/compress';
 * 
 * // Compress an image (uses AVIF/WebP via @jsquash when available)
 * const result = await compress(file, { format: 'auto' });
 * console.log(`Saved ${result.savings}%`);
 * 
 * // Compress with quality scoring
 * const scored = await compress(file, { measureQuality: true });
 * console.log(scored.qualityScore?.rating); // "excellent"
 * 
 * // Compress a PDF (full image recompression pipeline)
 * const pdf = await compressPDF(pdfFile, {
 *   mode: 'high',
 *   onProgress: (phase, pct) => console.log(`${phase}: ${pct}%`)
 * });
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
  PresetConfig,
  PDFModeConfig,
  QualityScore
} from './types';
