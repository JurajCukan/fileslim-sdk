/**
 * @fileslim/compress
 * Client-side file compression. Zero servers, complete privacy.
 * Supports images, PDFs, and DOCX documents.
 * 
 * @example
 * import { compress, compressPDF, compressBatch } from '@fileslim/compress';
 * 
 * const result = await compress(file, { format: 'auto' });
 * const pdf = await compressPDF(pdfFile, { mode: 'high' });
 * 
 * @packageDocumentation
 */

// Main compression functions
export { compress } from './compress';
export { compressPDF } from './pdf';
export { compressBatch } from './batch';

// Presets for quick configuration
export { PRESETS, PDF_MODES, DOCX_PRESETS } from './presets';

// Utility functions
export { formatSize, calculateSavings } from './utils';

// Type exports
export type {
  CompressOptions,
  CompressionMode,
  CompressionProgressEvent,
  PDFOptions,
  DocxOptions,
  BatchOptions,
  CompressedFile,
  BatchResult,
  ImageFormat,
  PresetName,
  PDFMode,
  DocxPresetName,
  PresetConfig,
  PDFModeConfig,
  DocxPresetConfig,
  QualityScore
} from './types';