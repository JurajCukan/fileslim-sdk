// ==========================================
// FileSlim SDK - Main Entry Point
// Client-side file compression library
// ==========================================

// -----------------------------------------
// Type Exports
// -----------------------------------------

export type {
  // Basic options
  CompressionOptions,
  AdvancedCompressionOptions,
  PerceptualSettings,
  
  // Results
  CompressionResult,
  BatchCompressionResult,
  QualityScore,
  
  // Metrics
  CompressionMetrics,
  CompressionRating,
  
  // Profiles
  PerformanceProfile,
  
  // PDF
  PDFCompressionMode,
  PDFCompressionSettings,
  PDFProgressCallback,
  
  // SDK Config
  FileSlimOptions,
  BatchCompressionProgress,
  BatchAnalytics,
  
  // Utilities
  ZipFileEntry,
  ImageFormat,
  FormatSupport
} from './types';

// -----------------------------------------
// Compression Profiles Export
// -----------------------------------------

export { compressionProfiles } from './core/metrics';

// -----------------------------------------
// Internal Imports
// -----------------------------------------

import { 
  compressImageAdvanced as coreCompressImageAdvanced,
  batchOptimizeImages,
  setVerboseLogging as setImageVerbose,
  supportsAVIF,
  supportsWebP,
  detectOptimalFormat,
  optimizePNG,
  optimizeJPEG,
  compressToWebP,
  compressToAVIF,
  compressToJXL,
  calculateQualityScore
} from './core/imageCompression';

import { 
  compressPDF as coreCompressPDF,
  setVerboseLogging as setPdfVerbose
} from './core/pdfCompression';

import { createZipFromFiles } from './utils/helpers';

import type { 
  CompressionOptions, 
  AdvancedCompressionOptions, 
  FileSlimOptions, 
  BatchCompressionProgress,
  PDFCompressionMode,
  PDFCompressionSettings,
  PDFProgressCallback,
  CompressionResult,
  BatchCompressionResult
} from './types';

// -----------------------------------------
// SDK Configuration
// -----------------------------------------

let sdkConfig: FileSlimOptions = {
  telemetry: false,
  verbose: false
};

/**
 * Configure FileSlim SDK globally
 * @param options - SDK configuration options
 * 
 * @example
 * ```typescript
 * import { configure } from '@fileslim/compress';
 * 
 * configure({ 
 *   verbose: true,  // Enable console logging
 *   telemetry: false // Disable anonymous usage tracking
 * });
 * ```
 */
export function configure(options: FileSlimOptions): void {
  sdkConfig = { ...sdkConfig, ...options };
  
  // Update verbose logging in core modules
  setImageVerbose(!!options.verbose);
  setPdfVerbose(!!options.verbose);
}

/**
 * Get current SDK configuration
 */
export function getConfig(): FileSlimOptions {
  return { ...sdkConfig };
}

// -----------------------------------------
// Image Compression API
// -----------------------------------------

/**
 * Compress a single image file
 * 
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed image as Blob
 * 
 * @example
 * ```typescript
 * import { compressImage } from '@fileslim/compress';
 * 
 * const compressed = await compressImage(file, {
 *   quality: 0.8,
 *   maxWidth: 1920,
 *   format: 'webp'
 * });
 * 
 * console.log(`Compressed: ${compressed.size} bytes`);
 * ```
 */
export async function compressImage(
  file: File,
  options: CompressionOptions & { 
    format?: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif';
    removeMetadata?: boolean;
  } = { quality: 0.8 }
): Promise<Blob> {
  if (sdkConfig.verbose) {
    console.log('[FileSlim] Compressing image:', file.name);
  }
  
  const result = await coreCompressImageAdvanced(file, {
    quality: options.quality,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    format: options.format || 'auto',
    removeMetadata: options.removeMetadata ?? true,
    optimizeForWeb: true
  });
  
  return result.blob;
}

/**
 * Compress image with advanced options and quality scoring
 * 
 * @param file - Image file to compress
 * @param options - Advanced compression options
 * @returns Compression result with blob and optional quality score
 * 
 * @example
 * ```typescript
 * import { compressImageAdvanced } from '@fileslim/compress';
 * 
 * const result = await compressImageAdvanced(file, {
 *   quality: 0.85,
 *   format: 'webp',
 *   calculateQualityScore: true
 * });
 * 
 * console.log(`Quality: ${result.qualityScore?.rating}`);
 * ```
 */
export async function compressImageAdvanced(
  file: File,
  options: AdvancedCompressionOptions
): Promise<CompressionResult> {
  if (sdkConfig.verbose) {
    console.log('[FileSlim] Advanced compression:', file.name, options);
  }
  
  return await coreCompressImageAdvanced(file, options);
}

// -----------------------------------------
// PDF Compression API
// -----------------------------------------

/**
 * Compress a PDF file
 * 
 * @param file - PDF file to compress
 * @param mode - Compression mode: 'balanced', 'maximum', or 'preserve-text'
 * @param options - Optional settings and progress callback
 * @returns Compressed PDF as Blob
 * 
 * @example
 * ```typescript
 * import { compressPDF } from '@fileslim/compress';
 * 
 * const compressed = await compressPDF(pdfFile, 'balanced', {
 *   onProgress: (phase, percentage) => {
 *     console.log(`${phase}: ${percentage}%`);
 *   }
 * });
 * ```
 */
export async function compressPDF(
  file: File,
  mode: PDFCompressionMode = 'balanced',
  options?: {
    settings?: PDFCompressionSettings;
    onProgress?: PDFProgressCallback;
  }
): Promise<Blob> {
  if (sdkConfig.verbose) {
    console.log('[FileSlim] Compressing PDF:', file.name, 'Mode:', mode);
  }
  
  return await coreCompressPDF(file, mode, options?.settings, options?.onProgress);
}

// -----------------------------------------
// Batch Compression API
// -----------------------------------------

/**
 * Compress multiple images and return as ZIP archive
 * 
 * @param files - Array of image files to compress
 * @param options - Compression options applied to all files
 * @param onProgress - Optional progress callback
 * @returns ZIP archive containing all compressed images
 * 
 * @example
 * ```typescript
 * import { compressBatch, compressionProfiles } from '@fileslim/compress';
 * 
 * const zipBlob = await compressBatch(
 *   files,
 *   compressionProfiles.web_optimized.settings,
 *   (progress) => {
 *     console.log(`${progress.current}/${progress.total}: ${progress.fileName}`);
 *   }
 * );
 * 
 * // Download the ZIP
 * downloadFile(zipBlob, 'compressed-images.zip');
 * ```
 */
export async function compressBatch(
  files: File[],
  options: AdvancedCompressionOptions,
  onProgress?: (progress: BatchCompressionProgress) => void
): Promise<Blob> {
  if (sdkConfig.verbose) {
    console.log('[FileSlim] Batch compression:', files.length, 'files');
  }
  
  const results = await batchOptimizeImages(
    files,
    options,
    (percentage, fileName) => {
      const current = Math.round((percentage / 100) * files.length);
      onProgress?.({
        current: Math.max(1, current),
        total: files.length,
        fileName,
        percentage
      });
    }
  );

  // Create ZIP with all compressed files
  const zipFiles = results.map(r => ({
    name: r.file.name,
    blob: r.compressed
  }));

  return await createZipFromFiles(zipFiles);
}

/**
 * Compress multiple images and return individual results
 * 
 * @param files - Array of image files to compress
 * @param options - Compression options applied to all files
 * @param onProgress - Optional progress callback
 * @returns Array of compression results for each file
 * 
 * @example
 * ```typescript
 * import { compressBatchIndividual } from '@fileslim/compress';
 * 
 * const results = await compressBatchIndividual(files, { quality: 0.8 });
 * 
 * results.forEach(result => {
 *   console.log(`${result.file.name}: ${result.originalSize} → ${result.compressedSize}`);
 * });
 * ```
 */
export async function compressBatchIndividual(
  files: File[],
  options: AdvancedCompressionOptions,
  onProgress?: (progress: BatchCompressionProgress) => void
): Promise<BatchCompressionResult[]> {
  if (sdkConfig.verbose) {
    console.log('[FileSlim] Batch compression (individual):', files.length, 'files');
  }
  
  return await batchOptimizeImages(
    files,
    options,
    (percentage, fileName) => {
      const current = Math.round((percentage / 100) * files.length);
      onProgress?.({
        current: Math.max(1, current),
        total: files.length,
        fileName,
        percentage
      });
    }
  );
}

// -----------------------------------------
// Format-Specific API
// -----------------------------------------

export {
  optimizePNG,
  optimizeJPEG,
  compressToWebP,
  compressToAVIF,
  compressToJXL
} from './core/imageCompression';

// -----------------------------------------
// Quality Assessment API
// -----------------------------------------

export { calculateQualityScore } from './core/imageCompression';

// -----------------------------------------
// Metrics & Utilities API
// -----------------------------------------

export { 
  formatFileSize, 
  getCompressionRating, 
  calculateMetrics, 
  analyzeBatchResults,
  estimateProcessingTime,
  assessQuality
} from './core/metrics';

export { 
  downloadFile,
  createZipFromFiles,
  estimateCompressionTime,
  formatEstimatedTime,
  blobToBase64,
  blobToFile,
  isImageFile,
  isPDFFile,
  getFileExtension,
  generateCompressedFilename,
  calculateSavings,
  formatSavings
} from './utils/helpers';

// -----------------------------------------
// Browser Support Detection
// -----------------------------------------

/**
 * Check browser format support
 * 
 * @returns Object with format support flags
 * 
 * @example
 * ```typescript
 * import { checkFormatSupport } from '@fileslim/compress';
 * 
 * const support = checkFormatSupport();
 * if (support.avif) {
 *   // Use AVIF for best compression
 * }
 * ```
 */
export function checkFormatSupport(): {
  jpeg: boolean;
  png: boolean;
  webp: boolean;
  avif: boolean;
} {
  return {
    jpeg: true, // Always supported
    png: true,  // Always supported
    webp: supportsWebP(),
    avif: supportsAVIF()
  };
}

/**
 * Get the optimal format for compression based on browser support
 * 
 * @param file - Image file to analyze
 * @returns Recommended format
 */
export { detectOptimalFormat } from './core/imageCompression';

// -----------------------------------------
// SDK Version
// -----------------------------------------

/**
 * SDK version
 */
export const VERSION = '1.0.0';
