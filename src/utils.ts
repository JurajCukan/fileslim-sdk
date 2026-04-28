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
    avif: 'image/avif',
    jxl: 'image/jxl',
    auto: 'image/webp' // Default fallback for auto
  };
  return mimeTypes[format] || 'image/webp';
}

/**
 * Detect best format based on browser support and file type
 * Priority: AVIF > WebP > JPEG
 */
export function detectBestFormat(file: File): 'avif' | 'webp' | 'jpeg' | 'png' {
  // Check AVIF support
  if (supportsAVIF()) {
    return 'avif';
  }
  
  // WebP supports transparency, good default
  if (file.type === 'image/png') {
    return 'webp';
  }
  
  return 'webp';
}

/**
 * Check AVIF browser support via canvas
 */
export function supportsAVIF(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  } catch {
    return false;
  }
}

/**
 * Load a File/Blob as ImageData via canvas
 */
export async function loadImageData(source: File | Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      // Downsample to 512x512 max for SSIM calculation
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(imageData);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(source);
  });
}

/**
 * Calculate SSIM between two ImageData objects (simplified inline version)
 * Returns a score from 0 to 1
 */
export function calculateSSIM(original: ImageData, compressed: ImageData): number {
  const w = Math.min(original.width, compressed.width);
  const h = Math.min(original.height, compressed.height);
  const size = w * h;
  
  if (size === 0) return 1;
  
  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
  
  for (let i = 0; i < size; i++) {
    const idx = i * 4;
    // Use luminance: 0.299R + 0.587G + 0.114B
    const x = 0.299 * original.data[idx] + 0.587 * original.data[idx + 1] + 0.114 * original.data[idx + 2];
    const y = 0.299 * compressed.data[idx] + 0.587 * compressed.data[idx + 1] + 0.114 * compressed.data[idx + 2];
    
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }
  
  const meanX = sumX / size;
  const meanY = sumY / size;
  const varX = sumXX / size - meanX * meanX;
  const varY = sumYY / size - meanY * meanY;
  const covXY = sumXY / size - meanX * meanY;
  
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  
  const ssim = ((2 * meanX * meanY + C1) * (2 * covXY + C2)) /
    ((meanX ** 2 + meanY ** 2 + C1) * (varX + varY + C2));
  
  return Math.max(0, Math.min(1, ssim));
}

/**
 * Get SSIM rating from score
 */
export function getSSIMRating(ssim: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
  if (ssim >= 0.98) return 'excellent';
  if (ssim >= 0.95) return 'good';
  if (ssim >= 0.85) return 'acceptable';
  return 'poor';
}
