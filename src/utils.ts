/**
 * @fileslim/compress - Utility Functions
 * Helper functions for compression operations
 */

/**
 * Replace file extension with new format
 */
export function replaceExtension(filename: string, format: string): string {
  const lastDot = filename.lastIndexOf('.');
  const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  
  // Map format to extension
  const ext = format === 'jpeg' ? 'jpg' : format;
  return `${baseName}.${ext}`;
}

/**
 * Calculate savings percentage
 */
export function calculateSavings(originalSize: number, compressedSize: number): number {
  if (originalSize <= 0) return 0;
  const savings = (1 - compressedSize / originalSize) * 100;
  return Math.max(0, Math.round(savings));
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Get appropriate MIME type for format
 */
export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    auto: 'image/webp' // Default to webp for auto
  };
  return mimeTypes[format] || 'image/webp';
}

/**
 * Detect best format based on browser support and file type
 */
export function detectBestFormat(file: File): 'webp' | 'jpeg' | 'png' {
  // Check for transparency (PNG)
  if (file.type === 'image/png') {
    return 'webp'; // WebP supports transparency
  }
  // Default to WebP for best compression
  return 'webp';
}
