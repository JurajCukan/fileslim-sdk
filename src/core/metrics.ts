// SDK Core: Compression Metrics
// Adapted from src/utils/compressionMetrics.ts

import type {
  CompressionMetrics,
  PerformanceProfile,
  CompressionRating,
  BatchAnalytics,
  AdvancedCompressionOptions
} from '../types';

// ==========================================
// Predefined Compression Profiles
// ==========================================

/**
 * Predefined compression profiles for different use cases
 */
export const compressionProfiles: Record<string, PerformanceProfile> = {
  web_optimized: {
    name: 'Web Optimized',
    description: 'Optimal balance for web usage',
    settings: {
      quality: 0.8,
      maxWidth: 1920,
      format: 'webp',
      removeMetadata: true,
      optimizeForWeb: true,
      enableProgressive: true
    } as AdvancedCompressionOptions,
    expectedSavings: 70,
    qualityRating: 'high'
  },
  
  social_media: {
    name: 'Social Media',
    description: 'Perfect for social platforms',
    settings: {
      quality: 0.75,
      maxWidth: 1080,
      format: 'jpeg',
      removeMetadata: true,
      optimizeForWeb: true,
      enableProgressive: false
    } as AdvancedCompressionOptions,
    expectedSavings: 75,
    qualityRating: 'medium'
  },
  
  email_friendly: {
    name: 'Email Friendly',
    description: 'Small files for email attachments',
    settings: {
      quality: 0.6,
      maxWidth: 800,
      format: 'jpeg',
      removeMetadata: true,
      optimizeForWeb: true,
      enableProgressive: false
    } as AdvancedCompressionOptions,
    expectedSavings: 85,
    qualityRating: 'medium'
  },
  
  print_quality: {
    name: 'Print Quality',
    description: 'Maintains quality for printing',
    settings: {
      quality: 0.95,
      maxWidth: null,
      format: 'auto',
      removeMetadata: false,
      optimizeForWeb: false,
      enableProgressive: false
    } as AdvancedCompressionOptions,
    expectedSavings: 30,
    qualityRating: 'maximum'
  },
  
  archive: {
    name: 'Archive',
    description: 'Long-term storage optimization',
    settings: {
      quality: 0.85,
      maxWidth: 2560,
      format: 'auto',
      removeMetadata: false,
      optimizeForWeb: false,
      enableProgressive: false
    } as AdvancedCompressionOptions,
    expectedSavings: 50,
    qualityRating: 'high'
  }
};

// ==========================================
// Metrics Calculation
// ==========================================

/**
 * Calculate compression metrics from a compression operation
 */
export const calculateMetrics = (
  originalSize: number,
  compressedSize: number,
  startTime: number,
  endTime: number,
  format: string,
  quality?: number
): CompressionMetrics => {
  const compressionRatio = compressedSize / originalSize;
  const spaceSaved = originalSize - compressedSize;
  const spaceSavedPercent = (spaceSaved / originalSize) * 100;
  const timeElapsed = endTime - startTime;

  return {
    originalSize,
    compressedSize,
    compressionRatio,
    spaceSaved,
    spaceSavedPercent,
    timeElapsed,
    quality,
    format
  };
};

// ==========================================
// Display Formatting
// ==========================================

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Human-readable size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
};

// ==========================================
// Quality Ratings
// ==========================================

/**
 * Get compression efficiency rating based on space saved percentage
 */
export const getCompressionRating = (spaceSavedPercent: number): CompressionRating => {
  if (spaceSavedPercent >= 80) {
    return {
      rating: 'excellent',
      color: 'text-green-500',
      description: 'Excellent compression'
    };
  } else if (spaceSavedPercent >= 60) {
    return {
      rating: 'good',
      color: 'text-blue-500',
      description: 'Good compression'
    };
  } else if (spaceSavedPercent >= 30) {
    return {
      rating: 'fair',
      color: 'text-yellow-500',
      description: 'Fair compression'
    };
  } else {
    return {
      rating: 'poor',
      color: 'text-red-500',
      description: 'Limited compression'
    };
  }
};

// ==========================================
// Time Estimation
// ==========================================

/**
 * Estimate processing time based on file size and type
 * @param fileSize - File size in bytes
 * @param fileType - MIME type of the file
 * @returns Estimated processing time in milliseconds
 */
export const estimateProcessingTime = (fileSize: number, fileType: string): number => {
  // Base processing time in milliseconds per MB
  const baseTimes: Record<string, number> = {
    'image/jpeg': 500,
    'image/png': 800,
    'image/webp': 600,
    'image/avif': 1000,
    'application/pdf': 1200
  };
  
  const fileSizeMB = fileSize / (1024 * 1024);
  const baseTime = baseTimes[fileType] || 1000;
  
  return Math.max(1000, fileSizeMB * baseTime);
};

// ==========================================
// Quality Assessment
// ==========================================

/**
 * Simplified quality assessment based on pixel differences
 * Note: This is not true SSIM but provides a basic quality indicator
 */
export const assessQuality = async (
  originalImageData: ImageData,
  compressedImageData: ImageData
): Promise<number> => {
  if (originalImageData.data.length !== compressedImageData.data.length) {
    return 0.5; // Different dimensions, return neutral score
  }
  
  let totalDifference = 0;
  const pixelCount = originalImageData.data.length / 4;
  
  for (let i = 0; i < originalImageData.data.length; i += 4) {
    const rDiff = Math.abs(originalImageData.data[i] - compressedImageData.data[i]);
    const gDiff = Math.abs(originalImageData.data[i + 1] - compressedImageData.data[i + 1]);
    const bDiff = Math.abs(originalImageData.data[i + 2] - compressedImageData.data[i + 2]);
    
    totalDifference += (rDiff + gDiff + bDiff) / 3;
  }
  
  const averageDifference = totalDifference / pixelCount;
  const normalizedDifference = averageDifference / 255;
  
  // Return quality score (1 = identical, 0 = completely different)
  return Math.max(0, 1 - normalizedDifference);
};

// ==========================================
// Batch Analytics
// ==========================================

/**
 * Analyze results from batch compression
 */
export const analyzeBatchResults = (metrics: CompressionMetrics[]): BatchAnalytics => {
  const totalOriginalSize = metrics.reduce((sum, m) => sum + m.originalSize, 0);
  const totalCompressedSize = metrics.reduce((sum, m) => sum + m.compressedSize, 0);
  const totalProcessingTime = metrics.reduce((sum, m) => sum + m.timeElapsed, 0);
  
  const averageCompressionRatio = totalCompressedSize / totalOriginalSize;
  const totalSpaceSaved = totalOriginalSize - totalCompressedSize;
  const totalSpaceSavedPercent = (totalSpaceSaved / totalOriginalSize) * 100;
  
  const qualityMetrics = metrics.filter(m => m.quality !== undefined);
  const averageQuality = qualityMetrics.length > 0 
    ? qualityMetrics.reduce((sum, m) => sum + m.quality!, 0) / qualityMetrics.length
    : undefined;
  
  return {
    totalOriginalSize,
    totalCompressedSize,
    averageCompressionRatio,
    totalSpaceSaved,
    totalSpaceSavedPercent,
    totalProcessingTime,
    fileCount: metrics.length,
    averageQuality
  };
};
