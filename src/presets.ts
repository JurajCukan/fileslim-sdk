/**
 * @fileslim/compress - Built-in Presets
 * Pre-configured compression settings for common use cases
 */

import type { PresetConfig, PresetName } from './types';

/** Built-in compression presets */
export const PRESETS: Record<PresetName, PresetConfig> = {
  /** Optimized for websites - good balance of quality and size */
  web: {
    quality: 0.75,
    maxWidth: 1920,
    format: 'webp'
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
export const PDF_MODES = {
  low: { imageQuality: 0.85, description: 'Light compression, best quality' },
  balanced: { imageQuality: 0.70, description: 'Good balance of quality and size' },
  high: { imageQuality: 0.50, description: 'Aggressive compression, smaller files' },
  maximum: { imageQuality: 0.30, description: 'Maximum compression, lowest quality' }
};
