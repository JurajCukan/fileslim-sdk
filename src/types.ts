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

/** DOCX preset names */
export type DocxPresetName = 'email' | 'balanced' | 'quality';

/** Image compression engine mode */
export type CompressionMode = 'standard' | 'best';

/** Progress event emitted by Best Algorithm mode */
export interface CompressionProgressEvent {
  phase: 'analysis' | 'encoding' | 'candidate' | 'selection' | 'quality' | 'fallback';
  message: string;
  algorithm?: string;
  status?: 'testing' | 'success' | 'fallback';
  size?: number;
  elapsed?: number;
  ssim?: number;
}

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
  /** Compression engine: standard hybrid encoder or app-matching Best Algorithm mode */
  mode?: CompressionMode;
  /** Alias for mode: 'best' */
  useBestAlgorithm?: boolean;
  /** Minimum SSIM accepted when measureQuality is enabled (default: 0.90) */
  minSSIM?: number;
  /** Test every available candidate format instead of a smart subset (default: false) */
  testAllFormats?: boolean;
  /** Best Algorithm progress callback. Batch compression also accepts the legacy (current, total) callback. */
  onProgress?: ((event: CompressionProgressEvent) => void) | ((current: number, total: number) => void);
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

/** Options for DOCX compression */
export interface DocxOptions {
  /** Image quality for embedded images 0.0-1.0 (default: 0.75) */
  imageQuality?: number;
  /** Max dimension for embedded images in pixels (default: 1920) */
  maxImageDimension?: number | null;
  /** DEFLATE compression level 1-9 (default: 9) */
  deflateLevel?: number;
  /** Strip revision tracking and comments (default: false) */
  stripRevisions?: boolean;
  /** Use a preset */
  preset?: DocxPresetName;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

/** Options for batch compression */
export interface BatchOptions extends Omit<CompressOptions, 'onProgress'> {
  /** Progress callback (current, total). Best Algorithm image progress is available through onFileProgress. */
  onProgress?: (current: number, total: number) => void;
  /** Best Algorithm per-file progress callback for image candidates */
  onFileProgress?: (file: File, event: CompressionProgressEvent) => void;
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

/** DOCX preset configuration */
export interface DocxPresetConfig {
  imageQuality: number;
  maxImageDimension: number | null;
  deflateLevel: number;
  stripRevisions: boolean;
  description: string;
}

/** Batch result with potential errors */
export interface BatchResult {
  results: CompressedFile[];
  errors: Array<{ file: File; error: Error }>;
}
