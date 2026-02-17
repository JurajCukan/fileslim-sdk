/**
 * @fileslim/compress - Type Definitions
 * All TypeScript interfaces for the SDK
 */

/** Supported image formats */
export type ImageFormat = 'auto' | 'jpeg' | 'png' | 'webp' | 'avif';

/** Preset names for quick configuration */
export type PresetName = 'web' | 'social' | 'email' | 'print';

/** PDF compression modes */
export type PDFMode = 'low' | 'balanced' | 'high' | 'maximum';

/** Options for image compression */
export interface CompressOptions {
  /** Quality level from 0.0 to 1.0 (default: 0.8) */
  quality?: number;
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number | null;
  /** Output format (default: 'webp') */
  format?: ImageFormat;
  /** Use a preset instead of manual options */
  preset?: PresetName;
  /** Strip EXIF/metadata from output (default: true) */
  stripMetadata?: boolean;
  /** Return SSIM quality score in result (default: false) */
  measureQuality?: boolean;
}

/** Options for PDF compression */
export interface PDFOptions {
  /** Compression mode (default: 'balanced') */
  mode?: PDFMode;
  /** Image quality for embedded images 0.0-1.0 (default: 0.7) */
  imageQuality?: number;
  /** Max dimension for embedded images in pixels (default varies by mode) */
  maxImageDimension?: number;
  /** Strip document metadata (default: true) */
  stripMetadata?: boolean;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

/** Options for batch compression */
export interface BatchOptions extends CompressOptions {
  /** Progress callback (current, total) */
  onProgress?: (current: number, total: number) => void;
  /** Continue on error instead of stopping */
  continueOnError?: boolean;
}

/** Quality score from SSIM measurement */
export interface QualityScore {
  /** SSIM score from 0 to 1 */
  ssim: number;
  /** Human-readable rating */
  rating: 'excellent' | 'good' | 'acceptable' | 'poor';
}

/** Unified result from all compression functions */
export interface CompressedFile {
  /** The compressed file as a Blob */
  blob: Blob;
  /** Suggested filename with correct extension */
  filename: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Savings percentage (0-100) */
  savings: number;
  /** MIME type of the result */
  format: string;
  /** Quality score (only present if measureQuality: true) */
  qualityScore?: QualityScore;
}

/** Preset configuration */
export interface PresetConfig {
  quality: number;
  maxWidth: number | null;
  format: ImageFormat;
}

/** PDF mode configuration */
export interface PDFModeConfig {
  imageQuality: number;
  maxImageDimension: number;
  description: string;
}

/** Batch result with potential errors */
export interface BatchResult {
  results: CompressedFile[];
  errors: Array<{ file: File; error: Error }>;
}
