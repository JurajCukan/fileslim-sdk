// ==========================================
// FileSlim SDK Type Definitions
// ==========================================

// -----------------------------------------
// Basic Compression Options
// -----------------------------------------

/**
 * Basic image compression options
 */
export interface CompressionOptions {
  /** Quality level from 0 (lowest) to 1 (highest). Default: 0.8 */
  quality: number;
  /** Maximum width in pixels. Image will be scaled down if larger. */
  maxWidth?: number | null;
  /** Maximum height in pixels. Image will be scaled down if larger. */
  maxHeight?: number | null;
}

// -----------------------------------------
// Advanced Compression Options
// -----------------------------------------

/**
 * Advanced image compression options with format control and metadata handling
 */
export interface AdvancedCompressionOptions {
  /** Quality level from 0 (lowest) to 1 (highest). Default: 0.8 */
  quality: number;
  /** Maximum width in pixels. Image will be scaled down if larger. */
  maxWidth?: number | null;
  /** Maximum height in pixels. Image will be scaled down if larger. */
  maxHeight?: number | null;
  /** Output format. 'auto' selects optimal format based on browser support. */
  format?: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif';
  /** Preserve transparency for PNG/WebP images. Default: true for PNG */
  preserveTransparency?: boolean;
  /** Remove EXIF and other metadata. Default: true */
  removeMetadata?: boolean;
  /** Enable progressive encoding for JPEG. Default: true */
  enableProgressive?: boolean;
  /** Apply web optimization filters. Default: true */
  optimizeForWeb?: boolean;
  /** Calculate SSIM quality score after compression. Default: false */
  calculateQualityScore?: boolean;
}

/**
 * Perceptual quality settings for detail preservation
 */
export interface PerceptualSettings {
  /** Target SSIM score (0-1). Higher values preserve more quality. */
  ssimTarget?: number;
  /** Enable zone-based detail preservation. */
  preserveDetails?: boolean;
  /** Enable color optimization. */
  colorOptimization?: boolean;
}

// -----------------------------------------
// Compression Results
// -----------------------------------------

/**
 * Quality score from SSIM analysis
 */
export interface QualityScore {
  /** SSIM score from 0 (completely different) to 1 (identical) */
  score: number;
  /** Human-readable quality rating */
  rating: 'excellent' | 'good' | 'acceptable' | 'check';
  /** Detailed explanation of the quality assessment */
  explanation: string;
}

/**
 * Result from advanced compression with optional quality scoring
 */
export interface CompressionResult {
  /** Compressed image blob */
  blob: Blob;
  /** Quality score if calculateQualityScore was enabled */
  qualityScore?: QualityScore;
}

/**
 * Result from batch compression for a single file
 */
export interface BatchCompressionResult {
  /** Original file */
  file: File;
  /** Compressed blob */
  compressed: Blob;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Quality score if calculated */
  qualityScore?: QualityScore;
}

// -----------------------------------------
// Compression Metrics
// -----------------------------------------

/**
 * Detailed metrics from a compression operation
 */
export interface CompressionMetrics {
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (compressedSize / originalSize) */
  compressionRatio: number;
  /** Space saved in bytes */
  spaceSaved: number;
  /** Space saved as percentage (0-100) */
  spaceSavedPercent: number;
  /** Time elapsed in milliseconds */
  timeElapsed: number;
  /** Quality setting used (0-1) */
  quality?: number;
  /** Output format used */
  format: string;
}

/**
 * Compression efficiency rating
 */
export interface CompressionRating {
  /** Rating category */
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  /** Tailwind color class for display */
  color: string;
  /** Human-readable description */
  description: string;
}

// -----------------------------------------
// Performance Profiles
// -----------------------------------------

/**
 * Predefined compression profile for specific use cases
 */
export interface PerformanceProfile {
  /** Profile display name */
  name: string;
  /** Profile description */
  description: string;
  /** Compression settings for this profile */
  settings: AdvancedCompressionOptions;
  /** Expected space savings percentage */
  expectedSavings: number;
  /** Quality rating for this profile */
  qualityRating: 'low' | 'medium' | 'high' | 'maximum';
}

// -----------------------------------------
// PDF Compression
// -----------------------------------------

/**
 * PDF compression mode
 */
export type PDFCompressionMode = 'balanced' | 'maximum' | 'preserve-text';

/**
 * Custom PDF compression settings
 */
export interface PDFCompressionSettings {
  /** Image quality for embedded images (0-1). Default: 0.7 */
  imageQuality?: number;
  /** Maximum dimension for embedded images. Default: 1920 */
  maxImageDimension?: number | null;
  /** Remove PDF annotations. Default: false */
  removeAnnotations?: boolean;
  /** Remove JavaScript from PDF. Default: true */
  removeJavaScript?: boolean;
}

/**
 * PDF compression progress callback
 */
export type PDFProgressCallback = (phase: string, percentage: number) => void;

// -----------------------------------------
// SDK Configuration
// -----------------------------------------

/**
 * Global SDK configuration options
 */
export interface FileSlimOptions {
  /** Enable opt-in anonymous usage telemetry. Default: false */
  telemetry?: boolean;
  /** Enable verbose console logging. Default: false */
  verbose?: boolean;
}

// -----------------------------------------
// Batch Processing
// -----------------------------------------

/**
 * Progress information for batch compression
 */
export interface BatchCompressionProgress {
  /** Current file index (1-based) */
  current: number;
  /** Total number of files */
  total: number;
  /** Current file name being processed */
  fileName: string;
  /** Overall progress percentage (0-100) */
  percentage: number;
}

// -----------------------------------------
// Batch Analytics
// -----------------------------------------

/**
 * Aggregated results from batch compression
 */
export interface BatchAnalytics {
  /** Total original size of all files in bytes */
  totalOriginalSize: number;
  /** Total compressed size of all files in bytes */
  totalCompressedSize: number;
  /** Average compression ratio across all files */
  averageCompressionRatio: number;
  /** Total space saved in bytes */
  totalSpaceSaved: number;
  /** Total space saved as percentage */
  totalSpaceSavedPercent: number;
  /** Total processing time in milliseconds */
  totalProcessingTime: number;
  /** Number of files processed */
  fileCount: number;
  /** Average quality score if calculated */
  averageQuality?: number;
}

// -----------------------------------------
// Utility Types
// -----------------------------------------

/**
 * File entry for ZIP creation
 */
export interface ZipFileEntry {
  /** File name in the ZIP archive */
  name: string;
  /** File content as Blob */
  blob: Blob;
}

/**
 * Supported image formats
 */
export type ImageFormat = 'auto' | 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl';

/**
 * Browser format support detection result
 */
export interface FormatSupport {
  jpeg: boolean;
  png: boolean;
  webp: boolean;
  avif: boolean;
  jxl: boolean;
}
