// SDK Utilities: Helper Functions
// Adapted from src/utils/fileCompression.ts

import type { ZipFileEntry } from '../types';

// ==========================================
// File Download
// ==========================================

/**
 * Download a blob as a file
 * @param blob - The blob to download
 * @param filename - Name for the downloaded file
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ==========================================
// ZIP Creation
// ==========================================

/**
 * Create a ZIP archive from multiple files
 * @param files - Array of file entries with name and blob
 * @param addCompressedSuffix - Whether to add '_compressed' suffix to filenames (default: true)
 * @returns ZIP archive as Blob
 */
export const createZipFromFiles = async (
  files: ZipFileEntry[],
  addCompressedSuffix: boolean = true
): Promise<Blob> => {
  // Dynamically import JSZip to reduce bundle size
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  files.forEach((file) => {
    let finalName = file.name;
    
    if (addCompressedSuffix) {
      const extension = file.name.split('.').pop() || '';
      const nameWithoutExt = file.name.replace(`.${extension}`, '');
      finalName = `${nameWithoutExt}_compressed.${extension}`;
    }
    
    zip.file(finalName, file.blob);
  });
  
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  return zipBlob;
};

// ==========================================
// Time Estimation
// ==========================================

/**
 * Estimate compression time based on file size and type
 * @param fileSize - File size in bytes
 * @param fileType - MIME type or file extension
 * @returns Estimated time in milliseconds
 */
export const estimateCompressionTime = (fileSize: number, fileType: string): number => {
  // Base processing time in milliseconds per MB
  const baseTimes: Record<string, number> = {
    // Images
    'image/jpeg': 500,
    'image/jpg': 500,
    'image/png': 800,
    'image/webp': 600,
    'image/avif': 1200,
    'image/gif': 400,
    // PDFs
    'application/pdf': 1500,
    // By extension fallback
    'jpeg': 500,
    'jpg': 500,
    'png': 800,
    'webp': 600,
    'avif': 1200,
    'pdf': 1500
  };
  
  const fileSizeMB = fileSize / (1024 * 1024);
  const normalizedType = fileType.toLowerCase();
  const baseTime = baseTimes[normalizedType] || 1000;
  
  // Minimum 500ms, scales with file size
  return Math.max(500, Math.round(fileSizeMB * baseTime));
};

/**
 * Format estimated time for display
 * @param ms - Time in milliseconds
 * @returns Human-readable time string
 */
export const formatEstimatedTime = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `~${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} min`;
};

// ==========================================
// Blob Utilities
// ==========================================

/**
 * Convert a Blob to base64 data URL
 * @param blob - Blob to convert
 * @returns Base64 data URL string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert a Blob to ArrayBuffer
 * @param blob - Blob to convert
 * @returns ArrayBuffer
 */
export const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
  return await blob.arrayBuffer();
};

/**
 * Create a File object from a Blob
 * @param blob - Source blob
 * @param filename - Name for the file
 * @param type - Optional MIME type (defaults to blob's type)
 * @returns File object
 */
export const blobToFile = (blob: Blob, filename: string, type?: string): File => {
  return new File([blob], filename, { type: type || blob.type });
};

// ==========================================
// File Type Detection
// ==========================================

/**
 * Check if a file is an image
 * @param file - File to check
 * @returns True if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if a file is a PDF
 * @param file - File to check
 * @returns True if file is a PDF
 */
export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

/**
 * Get file extension from filename
 * @param filename - Name of the file
 * @returns File extension without dot, lowercase
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

/**
 * Generate a compressed filename
 * @param originalName - Original filename
 * @param newExtension - Optional new extension (e.g., 'webp')
 * @returns New filename with _compressed suffix
 */
export const generateCompressedFilename = (
  originalName: string, 
  newExtension?: string
): string => {
  const ext = getFileExtension(originalName);
  const nameWithoutExt = originalName.slice(0, -(ext.length + 1));
  const finalExt = newExtension || ext;
  return `${nameWithoutExt}_compressed.${finalExt}`;
};

// ==========================================
// Size Formatting
// ==========================================

/**
 * Calculate savings percentage
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Savings as percentage (0-100)
 */
export const calculateSavings = (originalSize: number, compressedSize: number): number => {
  if (originalSize === 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
};

/**
 * Format savings for display
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Formatted string like "75% smaller"
 */
export const formatSavings = (originalSize: number, compressedSize: number): string => {
  const savings = calculateSavings(originalSize, compressedSize);
  if (savings <= 0) return 'No size reduction';
  return `${savings.toFixed(1)}% smaller`;
};
