/**
 * @fileslim/compress - Built-in Presets
 * Pre-configured compression settings for common use cases
 */

import type { PresetConfig, PresetName, PDFModeConfig } from './types';

/** Built-in compression presets */
export const PRESETS: Record<PresetName, PresetConfig> = {
  /** Optimized for websites - picks best format automatically */
  web: {
    quality: 0.75,
    maxWidth: 1920,
    format: 'auto'
  },
  
  /** Optimized for social media platforms */
  social: {
    quality: 0.80,
    maxWidth: 1080,
    format: 'jpeg'
  },
  
  /** Optimized for email attachments - smaller file size */
  email: {
    quality: 0.65,
    maxWidth: 800,
    format: 'jpeg'
  },
  
  /** High quality for printing - minimal compression */
  print: {
    quality: 0.95,
    maxWidth: null,
    format: 'auto'
  }
};

/** PDF compression mode settings */
export const PDF_MODES: Record<string, PDFModeConfig> = {
  low: { imageQuality: 0.85, maxImageDimension: 2000, description: 'Light compression, best quality' },
  balanced: { imageQuality: 0.70, maxImageDimension: 1600, description: 'Good balance of quality and size' },
  high: { imageQuality: 0.50, maxImageDimension: 1200, description: 'Aggressive compression, smaller files' },
  maximum: { imageQuality: 0.30, maxImageDimension: 1000, description: 'Maximum compression, lowest quality' }
};
