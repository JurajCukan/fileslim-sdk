/**
 * Privacy-friendly, opt-in only telemetry for FileSlim SDK
 * 
 * - Only sends anonymous, aggregated data
 * - Never includes file content or personal information
 * - Only activated when explicitly enabled via configure({ telemetry: true })
 * - Silent failure - never blocks user workflow
 */

import { sdkConfig } from '../index';

// Telemetry endpoint (placeholder - replace with actual endpoint when deployed)
const TELEMETRY_ENDPOINT = 'https://telemetry.fileslim.com/v1/events';

export type TelemetryEventType = 
  | 'compress-image'
  | 'compress-image-advanced'
  | 'compress-pdf'
  | 'compress-batch'
  | 'compress-batch-individual'
  | 'compress-webp'
  | 'compress-avif'
  | 'compress-jxl'
  | 'compress-png';

export interface TelemetryEvent {
  /** Event type */
  event: TelemetryEventType;
  /** Original file size bucket */
  sizeBucket: string;
  /** Compression ratio achieved (e.g., 0.65 = 65% of original) */
  compressionRatio: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** SDK version */
  sdkVersion: string;
  /** Output format (for images) */
  outputFormat?: string;
  /** Whether compression succeeded */
  success: boolean;
}

/**
 * Bucket file sizes for privacy (never send exact sizes)
 */
export function getSizeBucket(bytes: number): string {
  if (bytes < 100 * 1024) return '<100KB';
  if (bytes < 500 * 1024) return '100KB-500KB';
  if (bytes < 1024 * 1024) return '500KB-1MB';
  if (bytes < 5 * 1024 * 1024) return '1MB-5MB';
  if (bytes < 10 * 1024 * 1024) return '5MB-10MB';
  if (bytes < 50 * 1024 * 1024) return '10MB-50MB';
  if (bytes < 100 * 1024 * 1024) return '50MB-100MB';
  return '>100MB';
}

/**
 * Send anonymous telemetry data
 * 
 * @param event - Telemetry event data
 * @returns Promise that resolves when sent (or silently fails)
 * 
 * @example
 * ```typescript
 * // Only works if telemetry is enabled
 * await sendTelemetry({
 *   event: 'compress-image',
 *   sizeBucket: getSizeBucket(originalSize),
 *   compressionRatio: compressedSize / originalSize,
 *   processingTimeMs: endTime - startTime,
 *   sdkVersion: VERSION,
 *   outputFormat: 'webp',
 *   success: true
 * });
 * ```
 */
export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
  // Only send if telemetry is explicitly enabled
  if (!sdkConfig.telemetry) {
    return;
  }

  try {
    // Use sendBeacon for non-blocking send, fallback to fetch
    const payload = JSON.stringify({
      ...event,
      timestamp: Date.now(),
      // Add anonymous session ID (random per page load, not persistent)
      sessionId: getSessionId()
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // sendBeacon is fire-and-forget, perfect for telemetry
      navigator.sendBeacon(TELEMETRY_ENDPOINT, payload);
    } else if (typeof fetch !== 'undefined') {
      // Fallback to fetch with no-cors to prevent blocking
      fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true, // Allow request to outlive page
        mode: 'no-cors' // Don't wait for response
      }).catch(() => {
        // Silent failure - never throw
      });
    }
  } catch {
    // Silent failure - telemetry should never affect user experience
  }
}

/**
 * Generate a random session ID (not persistent across page loads)
 * Used only for grouping events within a single session
 */
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
  }
  return sessionId;
}

/**
 * Helper to track compression timing and send telemetry
 */
export function createTelemetryTracker(eventType: TelemetryEventType) {
  const startTime = performance.now();
  
  return {
    /**
     * Complete tracking and send telemetry
     */
    complete(params: {
      originalSize: number;
      compressedSize: number;
      outputFormat?: string;
      success?: boolean;
    }) {
      const processingTimeMs = Math.round(performance.now() - startTime);
      
      // Import VERSION dynamically to avoid circular dependency
      import('../index').then(({ VERSION }) => {
        sendTelemetry({
          event: eventType,
          sizeBucket: getSizeBucket(params.originalSize),
          compressionRatio: params.compressedSize / params.originalSize,
          processingTimeMs,
          sdkVersion: VERSION,
          outputFormat: params.outputFormat,
          success: params.success ?? true
        });
      }).catch(() => {
        // Silent failure
      });
    },
    
    /**
     * Report failure
     */
    fail(originalSize: number) {
      const processingTimeMs = Math.round(performance.now() - startTime);
      
      import('../index').then(({ VERSION }) => {
        sendTelemetry({
          event: eventType,
          sizeBucket: getSizeBucket(originalSize),
          compressionRatio: 1, // No compression on failure
          processingTimeMs,
          sdkVersion: VERSION,
          success: false
        });
      }).catch(() => {
        // Silent failure
      });
    }
  };
}
