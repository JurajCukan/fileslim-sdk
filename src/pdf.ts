/**
 * @fileslim/compress - PDF Compression
 * Full image extraction, recompression, and replacement pipeline
 * Ported from the proven FileSlim webapp implementation
 */

import type { PDFOptions, CompressedFile } from './types';
import { PDF_MODES } from './presets';
import { calculateSavings } from './utils';

/**
 * Compress a PDF file
 * 
 * Extracts embedded images, recompresses them with @jsquash/jpeg,
 * replaces them in the PDF, strips metadata, and tries multiple
 * save strategies to pick the smallest output.
 * 
 * @example
 * const result = await compressPDF(file);
 * 
 * @example
 * const result = await compressPDF(file, {
 *   mode: 'high',
 *   onProgress: (phase, pct) => console.log(`${phase}: ${pct}%`)
 * });
 */
export async function compressPDF(
  file: File,
  options?: PDFOptions
): Promise<CompressedFile> {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid input: expected a File object');
  }
  
  if (file.type !== 'application/pdf') {
    throw new Error(`Invalid file type: ${file.type}. Expected a PDF file.`);
  }

  const { PDFDocument, PDFName, PDFRawStream } = await import('pdf-lib');

  const mode = options?.mode ?? 'balanced';
  const modeConfig = PDF_MODES[mode];
  const imageQuality = options?.imageQuality ?? modeConfig.imageQuality;
  const maxImageDimension = options?.maxImageDimension ?? modeConfig.maxImageDimension;
  const stripMetadata = options?.stripMetadata ?? true;
  const onProgress = options?.onProgress;

  try {
    onProgress?.('Loading PDF', 5);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    
    onProgress?.('Analyzing', 10);

    onProgress?.('Extracting images', 15);
    
    const compressedImages = await extractAndCompressImages(
      pdfDoc,
      PDFName,
      imageQuality,
      maxImageDimension,
      (current, total) => {
        const pct = 20 + Math.round((current / Math.max(total, 1)) * 45);
        onProgress?.('Compressing images', pct);
      }
    );

    if (compressedImages.length > 0) {
      onProgress?.('Replacing images', 70);
      replaceImagesInPDF(pdfDoc, PDFName, PDFRawStream, compressedImages);
    }

    if (stripMetadata) {
      onProgress?.('Removing metadata', 75);
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('FileSlim');
      pdfDoc.setProducer('FileSlim');
    }

    onProgress?.('Saving', 80);
    
    let bestResult: Uint8Array | null = null;
    let bestSize = file.size;

    try {
      onProgress?.('Saving', 85);
      const result = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false
      });
      if (result.length < bestSize) {
        bestResult = result;
        bestSize = result.length;
      }
    } catch { /* strategy failed */ }

    try {
      onProgress?.('Saving', 90);
      const newDoc = await PDFDocument.create();
      
      for (let i = 0; i < pages.length; i++) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(copiedPage);
      }
      
      const result = await newDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false
      });
      if (result.length < bestSize) {
        bestResult = result;
        bestSize = result.length;
      }
    } catch { /* strategy failed */ }

    onProgress?.('Complete', 100);

    const compressedBlob = bestResult
      ? new Blob([new Uint8Array(bestResult)], { type: 'application/pdf' })
      : new Blob([arrayBuffer], { type: 'application/pdf' });

    const result: CompressedFile = {
      blob: compressedBlob,
      filename: file.name,
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      savings: calculateSavings(file.size, compressedBlob.size),
      format: 'application/pdf'
    };

    if (compressedBlob.size >= file.size) {
      return {
        ...result,
        blob: file,
        compressedSize: file.size,
        savings: 0
      };
    }

    return result;
  } catch (error) {
    throw new Error(
      `PDF compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Internal: Extract, decode, recompress embedded images
// ────────────────────────────────────────────────────────────────

interface CompressedImage {
  ref: any;
  compressedData: Uint8Array;
  mimeType: string;
}

async function extractAndCompressImages(
  pdfDoc: any,
  PDFName: any,
  quality: number,
  maxDimension: number,
  onProgress?: (current: number, total: number) => void
): Promise<CompressedImage[]> {
  const results: CompressedImage[] = [];
  const imageRefs: Array<{ ref: any; obj: any; width: number; height: number }> = [];

  try {
    const objects = pdfDoc.context.enumerateIndirectObjects();
    
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
              imageRefs.push({ ref, obj, width, height });
            }
          }
        }
      } catch {
        continue;
      }
    }

    onProgress?.(0, imageRefs.length);

    const BATCH_SIZE = 5;
    let processed = 0;

    for (let i = 0; i < imageRefs.length; i += BATCH_SIZE) {
      const batch = imageRefs.slice(i, Math.min(i + BATCH_SIZE, imageRefs.length));
      
      const batchResults = await Promise.all(
        batch.map(async ({ ref, obj, width, height }) => {
          try {
            const dict = obj.dict as any;
            const compressedImageBytes = obj.getContents?.();
            if (!compressedImageBytes || compressedImageBytes.length === 0) return null;

            let mimeType = 'image/jpeg';
            if (dict.has(PDFName.of('Filter'))) {
              const filter = dict.get(PDFName.of('Filter'))?.toString();
              if (filter?.includes('FlateDecode')) mimeType = 'image/png';
            }

            const imageBlob = new Blob([compressedImageBytes], { type: mimeType });
            let imageBitmap: ImageBitmap;
            try {
              imageBitmap = await createImageBitmap(imageBlob);
            } catch {
              return null;
            }

            let targetQuality = quality;
            const area = width * height;
            if (area < 100000) {
              targetQuality = Math.min(quality + 0.15, 0.95);
            } else if (area > 500000) {
              targetQuality = Math.max(quality - 0.10, 0.30);
            }

            let targetWidth = imageBitmap.width;
            let targetHeight = imageBitmap.height;
            if (targetWidth > maxDimension || targetHeight > maxDimension) {
              const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
              targetWidth = Math.round(targetWidth * scale);
              targetHeight = Math.round(targetHeight * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { imageBitmap.close(); return null; }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
            imageBitmap.close();

            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

            let compressedData: Uint8Array;
            let outputMime = 'image/jpeg';

            try {
              if (mimeType.includes('png')) {
                const { encode } = await import('@jsquash/png');
                const encoded = await encode(imageData);
                compressedData = new Uint8Array(encoded);
                outputMime = 'image/png';
              } else {
                const { encode } = await import('@jsquash/jpeg');
                const encoded = await encode(imageData, { quality: Math.round(targetQuality * 100) });
                compressedData = new Uint8Array(encoded);
                outputMime = 'image/jpeg';
              }
            } catch {
              const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', targetQuality);
              });
              if (!blob) return null;
              compressedData = new Uint8Array(await blob.arrayBuffer());
              outputMime = 'image/jpeg';
            }

            if (compressedData.length < compressedImageBytes.length) {
              return { ref, compressedData, mimeType: outputMime };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      for (const r of batchResults) {
        if (r) results.push(r);
      }

      processed += batch.length;
      onProgress?.(processed, imageRefs.length);

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch {
    // Silent fail
  }

  return results;
}

// ────────────────────────────────────────────────────────────────
// Internal: Replace image streams in PDF context
// ────────────────────────────────────────────────────────────────

function replaceImagesInPDF(
  pdfDoc: any,
  _PDFName: any,
  PDFRawStream: any,
  compressedImages: CompressedImage[]
): void {
  for (const { ref, compressedData } of compressedImages) {
    try {
      const obj = pdfDoc.context.lookup(ref);
      if (!obj || !obj.dict) continue;

      const newStream = PDFRawStream.of(obj.dict.clone(), compressedData);
      pdfDoc.context.assign(ref, newStream);
    } catch {
      // Skip failed replacements
    }
  }
}
