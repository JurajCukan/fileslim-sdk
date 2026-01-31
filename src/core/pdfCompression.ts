// SDK Core: PDF Compression
// Adapted from src/utils/fileCompression.ts

import type { PDFCompressionMode, PDFCompressionSettings, PDFProgressCallback } from '../types';

// SDK verbose logging flag
let verboseLogging = false;

export function setVerboseLogging(enabled: boolean): void {
  verboseLogging = enabled;
}

// Configuration constants
const PAGE_BATCH_SIZE = 10;
const LARGE_PDF_THRESHOLD = 20;

/**
 * Calculate adaptive timeout based on file size and page count
 */
const calculateAdaptiveTimeout = (fileSizeMB: number, pageCount?: number): number => {
  const baseTimeout = 60000; // 60 seconds
  const sizeTimeout = fileSizeMB * 10000; // 10s per MB
  const pageTimeout = pageCount ? pageCount * 5000 : 0; // 5s per page
  
  const totalTimeout = baseTimeout + sizeTimeout + pageTimeout;
  const maxTimeout = 5 * 60 * 1000; // 5 minutes max
  
  return Math.min(totalTimeout, maxTimeout);
};

/**
 * Format milliseconds to human-readable time
 */
const formatEstimatedTime = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `~${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} min`;
};

/**
 * Extract and compress images from PDF
 */
const extractAndCompressImages = async (
  pdfDoc: any,
  quality: number,
  maxDimension: number,
  onProgress?: (current: number, total: number, detail: string) => void
): Promise<{ ref: any; compressedData: Uint8Array; mimeType: string }[]> => {
  const { PDFName } = await import('pdf-lib');
  const compressedImages: { ref: any; compressedData: Uint8Array; mimeType: string }[] = [];
  const imageRefsToProcess: Array<{ ref: any; obj: any; width: number; height: number }> = [];
  
  try {
    const objects = pdfDoc.context.enumerateIndirectObjects();
    
    // First pass: collect all image references
    for (const [ref, obj] of objects) {
      try {
        if (obj && typeof obj === 'object' && 'dict' in obj && 'getContents' in obj) {
          const dict = obj.dict as any;
          
          if (
            dict?.has?.(PDFName.of('Type')) &&
            dict?.get?.(PDFName.of('Type'))?.toString() === '/XObject' &&
            dict?.has?.(PDFName.of('Subtype')) &&
            dict?.get?.(PDFName.of('Subtype'))?.toString() === '/Image'
          ) {
            const width = dict.has(PDFName.of('Width')) ? dict.get(PDFName.of('Width'))?.asNumber() : 0;
            const height = dict.has(PDFName.of('Height')) ? dict.get(PDFName.of('Height'))?.asNumber() : 0;
            
            if (width > 0 && height > 0) {
              imageRefsToProcess.push({ ref, obj, width, height });
            }
          }
        }
      } catch {
        continue;
      }
    }
    
    if (verboseLogging) console.log(`[FileSlim] Found ${imageRefsToProcess.length} images to process`);
    onProgress?.(0, imageRefsToProcess.length, `Found ${imageRefsToProcess.length} images`);
    
    // Process images in batches
    const BATCH_SIZE = 5;
    let processedCount = 0;
    
    for (let i = 0; i < imageRefsToProcess.length; i += BATCH_SIZE) {
      const batch = imageRefsToProcess.slice(i, Math.min(i + BATCH_SIZE, imageRefsToProcess.length));
      
      const batchResults = await Promise.all(
        batch.map(async ({ ref, obj, width, height }) => {
          try {
            const dict = obj.dict as any;
            onProgress?.(
              processedCount + 1, 
              imageRefsToProcess.length, 
              `Compressing image ${processedCount + 1} of ${imageRefsToProcess.length} (${width}×${height}px)`
            );
            
            const compressedImageBytes = obj.getContents?.();
            if (!compressedImageBytes || compressedImageBytes.length === 0) {
              return null;
            }
            
            // Determine image format from PDF filters
            let mimeType = 'image/jpeg';
            if (dict.has(PDFName.of('Filter'))) {
              const filter = dict.get(PDFName.of('Filter'))?.toString();
              if (filter?.includes('DCT')) mimeType = 'image/jpeg';
              else if (filter?.includes('FlateDecode')) mimeType = 'image/png';
            }
            
            // Decode the compressed bytes
            const imageBlob = new Blob([compressedImageBytes], { type: mimeType });
            let imageBitmap: ImageBitmap;
            
            try {
              imageBitmap = await createImageBitmap(imageBlob);
            } catch {
              return null;
            }
            
            // Calculate target dimensions and quality
            let targetWidth = imageBitmap.width;
            let targetHeight = imageBitmap.height;
            let targetQuality = quality;
            
            const imageArea = width * height;
            if (imageArea < 100000) {
              targetQuality = Math.min(quality + 0.15, 0.95);
            } else if (imageArea >= 500000) {
              targetQuality = Math.max(quality - 0.1, 0.3);
            }
            
            if (targetWidth > maxDimension || targetHeight > maxDimension) {
              const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
              targetWidth = Math.round(targetWidth * scale);
              targetHeight = Math.round(targetHeight * scale);
            }
            
            // Create canvas and draw decoded image
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) return null;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
            
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            
            // Compress using @jsquash
            let compressedData: Uint8Array;
            
            try {
              if (mimeType.includes('png')) {
                const { encode } = await import('@jsquash/png');
                const encoded = await encode(imageData);
                compressedData = new Uint8Array(encoded);
              } else {
                const { encode } = await import('@jsquash/jpeg');
                const encoded = await encode(imageData, { quality: Math.round(targetQuality * 100) });
                compressedData = new Uint8Array(encoded);
                mimeType = 'image/jpeg';
              }
            } catch {
              // Fallback to canvas
              const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, mimeType, targetQuality);
              });
              
              if (!blob) return null;
              
              const arrayBuffer = await blob.arrayBuffer();
              compressedData = new Uint8Array(arrayBuffer);
            }
            
            // Only include if compression achieved
            const compressionRatio = compressedData.length / compressedImageBytes.length;
            if (compressionRatio < 1.0) {
              imageBitmap.close();
              return { ref, compressedData, mimeType };
            } else {
              imageBitmap.close();
              return null;
            }
          } catch {
            return null;
          }
        })
      );
      
      for (const result of batchResults) {
        if (result) {
          compressedImages.push(result);
        }
      }
      
      processedCount += batch.length;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error) {
    if (verboseLogging) console.error('[FileSlim] Error extracting images:', error);
  }
  
  return compressedImages;
};

/**
 * Replace images in PDF with compressed versions
 */
const replaceImagesInPDF = async (
  pdfDoc: any,
  compressedImages: { ref: any; compressedData: Uint8Array; mimeType: string }[]
): Promise<void> => {
  const { PDFRawStream } = await import('pdf-lib');
  
  for (const { ref, compressedData } of compressedImages) {
    try {
      const obj = pdfDoc.context.lookup(ref);
      if (!obj || !obj.dict) continue;
      
      const newStream = PDFRawStream.of(
        obj.dict.clone(),
        compressedData
      );
      
      pdfDoc.context.assign(ref, newStream);
    } catch {
      // Skip failed replacements
    }
  }
};

/**
 * Compress a PDF file
 * @param file - PDF file to compress
 * @param mode - Compression mode: 'balanced', 'maximum', or 'preserve-text'
 * @param customSettings - Optional custom compression settings
 * @param onProgress - Optional progress callback
 * @returns Compressed PDF as Blob
 */
export const compressPDF = async (
  file: File, 
  mode: PDFCompressionMode = 'balanced',
  customSettings?: PDFCompressionSettings,
  onProgress?: PDFProgressCallback
): Promise<Blob> => {
  if (verboseLogging) console.log('[FileSlim] Compressing PDF:', file.name, 'Mode:', mode);
  
  const { PDFDocument } = await import('pdf-lib');
  
  // Mode presets
  const modeSettings: Record<PDFCompressionMode, { quality: number; maxDimension: number }> = {
    'balanced': { quality: 0.7, maxDimension: 1920 },
    'maximum': { quality: 0.5, maxDimension: 1200 },
    'preserve-text': { quality: 0.85, maxDimension: 2560 }
  };
  
  const settings = modeSettings[mode];
  const imageQuality = customSettings?.imageQuality ?? settings.quality;
  const maxImageDimension = customSettings?.maxImageDimension ?? settings.maxDimension;
  
  const fileSizeMB = file.size / (1024 * 1024);
  
  onProgress?.('Loading PDF', 5);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    
    if (verboseLogging) console.log(`[FileSlim] PDF has ${pageCount} pages, ${fileSizeMB.toFixed(1)}MB`);
    
    onProgress?.('Analyzing', 15);
    
    // Extract and compress images
    onProgress?.('Compressing images', 25);
    
    const compressedImages = await extractAndCompressImages(
      pdfDoc,
      imageQuality,
      maxImageDimension,
      (current, total, detail) => {
        const progress = 25 + ((current / total) * 50);
        onProgress?.(detail, Math.round(progress));
      }
    );
    
    if (verboseLogging) console.log(`[FileSlim] Compressed ${compressedImages.length} images`);
    
    // Replace images in PDF
    onProgress?.('Rebuilding PDF', 80);
    
    if (compressedImages.length > 0) {
      await replaceImagesInPDF(pdfDoc, compressedImages);
    }
    
    // Save with optimizations
    onProgress?.('Finalizing', 90);
    
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });
    
    onProgress?.('Complete', 100);
    
    const compressedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    if (verboseLogging) {
      const savedPercent = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);
      console.log(`[FileSlim] PDF compression complete: ${(file.size/1024).toFixed(0)}KB → ${(compressedBlob.size/1024).toFixed(0)}KB (saved ${savedPercent}%)`);
    }
    
    return compressedBlob;
  } catch (error) {
    if (verboseLogging) console.error('[FileSlim] PDF compression error:', error);
    throw new Error(`Failed to compress PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
