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
 * // Basic usage
 * const result = await compressPDF(file);
 * 
 * @example
 * // With progress tracking
 * const result = await compressPDF(file, {
 *   mode: 'high',
 *   onProgress: (phase, pct) => console.log(`${phase}: ${pct}%`)
 * });
 */
export async function compressPDF(
  file: File,
  options?: PDFOptions
): Promise<CompressedFile> {
  // Validate input
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid input: expected a File object');
  }
  
  if (file.type !== 'application/pdf') {
    throw new Error(`Invalid file type: ${file.type}. Expected a PDF file.`);
  }

  const { PDFDocument, PDFName, PDFDict, PDFRawStream } = await import('pdf-lib');

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

    // ── Phase 1: Extract and recompress embedded images ──
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

    // Replace images in PDF
    if (compressedImages.length > 0) {
      onProgress?.('Replacing images', 70);
      replaceImagesInPDF(pdfDoc, PDFName, PDFRawStream, compressedImages);
    }

    // ── Phase 2: Strip metadata ──
    if (stripMetadata) {
      onProgress?.('Removing metadata', 75);
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('FileSlim');
      pdfDoc.setProducer('FileSlim');
    }

    // ── Phase 3: Multi-strategy save — pick smallest ──
    onProgress?.('Saving', 80);
    
    let bestResult: Uint8Array | null = null;
    let bestSize = file.size;

    // Strategy 1: Direct save with object streams
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

    // Strategy 2: Copy to new document
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

    // If compressed is larger, return original
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

async function decompressFlateDataSDK(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(data.slice(0));
  writer.close();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

function rawPixelsToRGBASDK(raw: Uint8Array, w: number, h: number, components: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (components === 3) {
      rgba[i*4] = raw[i*3]; rgba[i*4+1] = raw[i*3+1]; rgba[i*4+2] = raw[i*3+2];
    } else if (components === 1) {
      rgba[i*4] = rgba[i*4+1] = rgba[i*4+2] = raw[i];
    } else if (components === 4) {
      const c=raw[i*4], m=raw[i*4+1], y=raw[i*4+2], k=raw[i*4+3];
      rgba[i*4] = 255*(1-c/255)*(1-k/255);
      rgba[i*4+1] = 255*(1-m/255)*(1-k/255);
      rgba[i*4+2] = 255*(1-y/255)*(1-k/255);
    }
    rgba[i*4+3] = 255;
  }
  return rgba;
}

  pdfDoc: any,
  PDFName: any,
  quality: number,
  maxDimension: number,
  onProgress?: (current: number, total: number) => void
): Promise<CompressedImage[]> {
  const results: CompressedImage[] = [];
  const imageRefs: Array<{ ref: any; obj: any; width: number; height: number }> = [];

  try {
    // Collect all image XObjects
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

    // Process images in batches of 5
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

            // Determine filter type
            const filter = dict.has(PDFName.of('Filter')) ? dict.get(PDFName.of('Filter'))?.toString() ?? '' : '';
            const isDCT = filter.includes('DCT');
            const isFlate = filter.includes('FlateDecode');
            let mimeType = 'image/jpeg';
            
            const canvas = document.createElement('canvas');
            let ctx: CanvasRenderingContext2D | null = null;
            
            if (isDCT) {
              const imageBlob = new Blob([compressedImageBytes], { type: 'image/jpeg' });
              let imageBitmap: ImageBitmap;
              try {
                imageBitmap = await createImageBitmap(imageBlob);
              } catch { return null; }
              canvas.width = imageBitmap.width;
              canvas.height = imageBitmap.height;
              ctx = canvas.getContext('2d');
              if (!ctx) { imageBitmap.close(); return null; }
              ctx.drawImage(imageBitmap, 0, 0);
              imageBitmap.close();
            } else if (isFlate) {
              let decompressed: Uint8Array;
              try {
                decompressed = await decompressFlateDataSDK(compressedImageBytes);
              } catch { return null; }
              
              const bpc = dict.has(PDFName.of('BitsPerComponent')) ? dict.get(PDFName.of('BitsPerComponent'))?.asNumber() ?? 8 : 8;
              const cs = dict.has(PDFName.of('ColorSpace')) ? dict.get(PDFName.of('ColorSpace'))?.toString() ?? '/DeviceRGB' : '/DeviceRGB';
              const components = cs.includes('Gray') ? 1 : cs.includes('CMYK') ? 4 : 3;
              
              const expectedSize = width * height * components * (bpc / 8);
              if (decompressed.length < expectedSize) return null;
              
              const rgba = rawPixelsToRGBASDK(decompressed, width, height, components);
              const imageData = new ImageData(rgba.slice(0) as any, width, height);
              
              canvas.width = width;
              canvas.height = height;
              ctx = canvas.getContext('2d');
              if (!ctx) return null;
              ctx.putImageData(imageData, 0, 0);
            } else {
              // Unknown filter — try createImageBitmap
              const imageBlob = new Blob([compressedImageBytes], { type: 'image/jpeg' });
              try {
                const ib = await createImageBitmap(imageBlob);
                canvas.width = ib.width;
                canvas.height = ib.height;
                ctx = canvas.getContext('2d');
                if (!ctx) { ib.close(); return null; }
                ctx.drawImage(ib, 0, 0);
                ib.close();
              } catch { return null; }
            }

            // Size-aware quality adjustment
            let targetQuality = quality;
            const area = width * height;
            if (area < 100000) {
              targetQuality = Math.min(quality + 0.15, 0.95);
            } else if (area > 500000) {
              targetQuality = Math.max(quality - 0.10, 0.30);
            }

            // Calculate target dimensions
            let targetWidth = canvas.width;
            let targetHeight = canvas.height;
            if (targetWidth > maxDimension || targetHeight > maxDimension) {
              const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
              targetWidth = Math.round(targetWidth * scale);
              targetHeight = Math.round(targetHeight * scale);
              const resizeCanvas = document.createElement('canvas');
              resizeCanvas.width = targetWidth;
              resizeCanvas.height = targetHeight;
              const resizeCtx = resizeCanvas.getContext('2d');
              if (!resizeCtx) return null;
              resizeCtx.imageSmoothingEnabled = true;
              resizeCtx.imageSmoothingQuality = 'high';
              resizeCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              ctx!.drawImage(resizeCanvas, 0, 0);
            }

            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);

            // Encode as JPEG
            let compressedData: Uint8Array;
            let outputMime = 'image/jpeg';

            try {
              const { encode } = await import('@jsquash/jpeg');
              const encoded = await encode(imageData, { quality: Math.round(targetQuality * 100) });
              compressedData = new Uint8Array(encoded);
            } catch {
              const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', targetQuality);
              });
              if (!blob) return null;
              compressedData = new Uint8Array(await blob.arrayBuffer());
            }

            // Only keep if we actually saved space
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

      // Yield to main thread between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch {
    // Silent fail — compression still works via object streams
  }

  return results;
}

// ────────────────────────────────────────────────────────────────
// Internal: Replace image streams in PDF context
// ────────────────────────────────────────────────────────────────

function replaceImagesInPDF(
  pdfDoc: any,
  PDFName: any,
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
