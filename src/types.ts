/**
 * @fileslim/compress - Type Definitions
 * All TypeScript interfaces for the SDK
 */

/** Supported image formats */
export type ImageFormat = 'auto' | 'jpeg' | 'png' | 'webp';

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
}

/** Options for PDF compression */
export interface PDFOptions {
  /** Compression mode (default: 'balanced') */
  mode?: PDFMode;
  /** Image quality for embedded images 0.0-1.0 (default: 0.7) */
  imageQuality?: number;
}

/** Options for batch compression */
export interface BatchOptions extends CompressOptions {
  /** Progress callback (current, total) */
  onProgress?: (current: number, total: number) => void;
  /** Continue on error instead of stopping */
  continueOnError?: boolean;
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
}

/** Preset configuration */
export interface PresetConfig {
  quality: number;
  maxWidth: number | null;
  format: ImageFormat;
}

/** Batch result with potential errors */
export interface BatchResult {
  results: CompressedFile[];
  errors: Array<{ file: File; error: Error }>;
}
