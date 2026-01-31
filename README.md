# @fileslim/compress

Client-side file compression library that runs entirely in the browser. Compress images and PDFs using your users' device power—zero server costs, unlimited usage.

[![npm version](https://img.shields.io/npm/v/@fileslim/compress.svg)](https://www.npmjs.com/package/@fileslim/compress)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Features

✅ **100% Client-Side** - No uploads, files never leave the user's device  
✅ **Zero Server Costs** - Uses client CPU, not your infrastructure  
✅ **No API Keys** - No rate limits, no authentication required  
✅ **Privacy First** - Files are processed locally in the browser  
✅ **Modern Formats** - JPEG, PNG, WebP, AVIF, JPEG XL, PDF support  
✅ **Smart Compression** - Multiple quality profiles optimized for different use cases  
✅ **Batch Processing** - Compress multiple files with progress tracking  
✅ **Quality Scoring** - SSIM-based quality assessment  
✅ **TypeScript** - Full type definitions included  
✅ **Tree-Shakeable** - Import only what you need  

## Installation

### NPM / Yarn / PNPM

```bash
# npm
npm install @fileslim/compress

# yarn
yarn add @fileslim/compress

# pnpm
pnpm add @fileslim/compress
```

### CDN (Script Tag)

```html
<script src="https://cdn.jsdelivr.net/npm/@fileslim/compress/dist/index.umd.js"></script>
<script>
  // Available as global `FileSlim`
  FileSlim.compressImage(file, { quality: 0.8 }).then(blob => {
    console.log('Compressed:', blob.size);
  });
</script>
```

## Quick Start

### Compress a Single Image

```typescript
import { compressImage, formatFileSize } from '@fileslim/compress';

const fileInput = document.querySelector('input[type="file"]');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  const compressed = await compressImage(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp'
  });
  
  console.log(`Original: ${formatFileSize(file.size)}`);
  console.log(`Compressed: ${formatFileSize(compressed.size)}`);
  
  // Create download link
  const url = URL.createObjectURL(compressed);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compressed-image.webp';
  a.click();
});
```

### Compress a PDF

```typescript
import { compressPDF } from '@fileslim/compress';

const compressed = await compressPDF(pdfFile, 'balanced', {
  onProgress: (phase, percentage) => {
    console.log(`${phase}: ${percentage}%`);
  }
});

console.log(`Saved ${((1 - compressed.size / pdfFile.size) * 100).toFixed(1)}%`);
```

### Batch Compress with Progress

```typescript
import { compressBatch, compressionProfiles, downloadFile } from '@fileslim/compress';

const zipBlob = await compressBatch(
  filesArray,
  compressionProfiles.web_optimized.settings,
  (progress) => {
    console.log(`${progress.current}/${progress.total}: ${progress.fileName}`);
    progressBar.value = progress.percentage;
  }
);

// Download the ZIP
downloadFile(zipBlob, 'compressed-images.zip');
```

### Use Compression Profiles

```typescript
import { compressImageAdvanced, compressionProfiles } from '@fileslim/compress';

// Use predefined profiles for common use cases
const result = await compressImageAdvanced(
  file, 
  compressionProfiles.social_media.settings
);

console.log(`Compressed for social media: ${result.blob.size} bytes`);
```

---

## API Reference

### Configuration

#### `configure(options: FileSlimOptions): void`

Configure the SDK globally.

```typescript
import { configure } from '@fileslim/compress';

configure({ 
  verbose: true,    // Enable console logging
  telemetry: false  // Disable anonymous usage tracking (default)
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `verbose` | `boolean` | `false` | Enable detailed console logging |
| `telemetry` | `boolean` | `false` | Enable anonymous usage tracking |

---

### Image Compression

#### `compressImage(file, options): Promise<Blob>`

Compress a single image file with simple options.

```typescript
const compressed = await compressImage(file, {
  quality: 0.8,        // 0-1, default 0.8
  maxWidth: 1920,      // Max width in pixels
  maxHeight: 1080,     // Max height in pixels
  format: 'webp',      // 'auto' | 'jpeg' | 'png' | 'webp' | 'avif'
  removeMetadata: true // Remove EXIF data
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `File` | Yes | Image file to compress |
| `options.quality` | `number` | No | Quality level 0-1 (default: 0.8) |
| `options.maxWidth` | `number` | No | Maximum width in pixels |
| `options.maxHeight` | `number` | No | Maximum height in pixels |
| `options.format` | `string` | No | Output format (default: 'auto') |
| `options.removeMetadata` | `boolean` | No | Remove EXIF metadata (default: true) |

**Returns:** `Promise<Blob>` - Compressed image

---

#### `compressImageAdvanced(file, options): Promise<CompressionResult>`

Advanced compression with quality scoring and perceptual optimization.

```typescript
const result = await compressImageAdvanced(file, {
  quality: 0.85,
  maxWidth: 1920,
  format: 'webp',
  preserveTransparency: true,
  removeMetadata: true,
  optimizeForWeb: true,
  calculateQualityScore: true
});

console.log(`Quality: ${result.qualityScore?.rating}`); // 'excellent' | 'good' | 'acceptable' | 'check'
console.log(`SSIM Score: ${result.qualityScore?.score}`); // 0-1
```

**Returns:** `Promise<CompressionResult>`

```typescript
interface CompressionResult {
  blob: Blob;
  qualityScore?: {
    score: number;      // SSIM score 0-1
    rating: 'excellent' | 'good' | 'acceptable' | 'check';
    explanation: string;
  };
}
```

---

### PDF Compression

#### `compressPDF(file, mode, options): Promise<Blob>`

Compress a PDF file with embedded image optimization.

```typescript
const compressed = await compressPDF(pdfFile, 'balanced', {
  settings: {
    imageQuality: 0.7,
    maxImageDimension: 1920
  },
  onProgress: (phase, percentage) => {
    updateProgress(phase, percentage);
  }
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `File` | Yes | PDF file to compress |
| `mode` | `string` | No | Compression mode (default: 'balanced') |
| `options.settings` | `object` | No | Custom compression settings |
| `options.onProgress` | `function` | No | Progress callback |

**Compression Modes:**

| Mode | Image Quality | Max Dimension | Use Case |
|------|--------------|---------------|----------|
| `balanced` | 70% | 1920px | General use |
| `maximum` | 50% | 1200px | Smallest file size |
| `preserve-text` | 85% | 2560px | Text-heavy documents |

---

### Batch Processing

#### `compressBatch(files, options, onProgress): Promise<Blob>`

Compress multiple images and return as ZIP archive.

```typescript
const zipBlob = await compressBatch(
  files,
  { quality: 0.8, format: 'webp' },
  (progress) => {
    console.log(`${progress.current}/${progress.total}`);
  }
);

downloadFile(zipBlob, 'images.zip');
```

---

#### `compressBatchIndividual(files, options, onProgress): Promise<BatchCompressionResult[]>`

Compress multiple images and return individual results.

```typescript
const results = await compressBatchIndividual(files, { quality: 0.8 });

for (const result of results) {
  console.log(`${result.file.name}: ${result.originalSize} → ${result.compressedSize}`);
}
```

---

### Format-Specific Functions

```typescript
import { 
  optimizePNG, 
  optimizeJPEG, 
  compressToWebP, 
  compressToAVIF,
  compressToJXL 
} from '@fileslim/compress';

// Lossless PNG optimization
const optimizedPng = await optimizePNG(file, true);

// JPEG with quality control
const optimizedJpeg = await optimizeJPEG(file, 0.85, true);

// Convert to WebP
const webp = await compressToWebP(file, 0.8, false);

// Convert to AVIF (best compression)
const avif = await compressToAVIF(file, 0.8);

// Convert to JPEG XL
const jxl = await compressToJXL(file, 0.8, 7);
```

---

### Compression Profiles

Pre-configured settings for common use cases:

```typescript
import { compressionProfiles } from '@fileslim/compress';

// Available profiles:
compressionProfiles.web_optimized    // Balanced for web (70% savings)
compressionProfiles.social_media     // Optimized for Instagram/Facebook
compressionProfiles.email_friendly   // Small files for email (85% savings)
compressionProfiles.print_quality    // High quality for printing
compressionProfiles.archive          // Long-term storage optimization
```

| Profile | Quality | Max Width | Format | Expected Savings |
|---------|---------|-----------|--------|------------------|
| `web_optimized` | 80% | 1920px | WebP | ~70% |
| `social_media` | 75% | 1080px | JPEG | ~75% |
| `email_friendly` | 60% | 800px | JPEG | ~85% |
| `print_quality` | 95% | Original | Auto | ~30% |
| `archive` | 85% | 2560px | Auto | ~50% |

---

### Utility Functions

```typescript
import {
  formatFileSize,
  downloadFile,
  createZipFromFiles,
  estimateCompressionTime,
  calculateSavings,
  checkFormatSupport,
  isImageFile,
  isPDFFile
} from '@fileslim/compress';

// Format bytes for display
formatFileSize(1536000);  // "1.5 MB"

// Download a blob
downloadFile(blob, 'image.webp');

// Create ZIP from files
const zip = await createZipFromFiles([
  { name: 'image1.jpg', blob: blob1 },
  { name: 'image2.jpg', blob: blob2 }
]);

// Estimate processing time
const ms = estimateCompressionTime(file.size, file.type);

// Calculate savings percentage
const savings = calculateSavings(originalSize, compressedSize);

// Check browser format support
const support = checkFormatSupport();
if (support.avif) {
  // Use AVIF for best compression
}

// Check file types
if (isImageFile(file)) { /* ... */ }
if (isPDFFile(file)) { /* ... */ }
```

---

## Browser Compatibility

| Browser | Version | WebP | AVIF | JPEG XL |
|---------|---------|------|------|---------|
| Chrome | 80+ | ✅ | ✅ | ❌ |
| Firefox | 80+ | ✅ | ✅ | ❌ |
| Safari | 14+ | ✅ | 16+ | ❌ |
| Edge | 80+ | ✅ | ✅ | ❌ |

**Minimum Requirements:**
- Canvas API support
- Web Workers support
- ES2020 compatible

---

## React Example

```tsx
import React, { useState } from 'react';
import { compressImage, formatFileSize, calculateSavings } from '@fileslim/compress';

export function ImageCompressor() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const compressed = await compressImage(file, {
        quality: 0.8,
        maxWidth: 1920,
        format: 'webp'
      });

      const savings = calculateSavings(file.size, compressed.size);
      
      setResult(`
        Original: ${formatFileSize(file.size)}
        Compressed: ${formatFileSize(compressed.size)}
        Saved: ${savings.toFixed(1)}%
      `);

      // Auto-download
      const url = URL.createObjectURL(compressed);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^.]+$/, '.webp');
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setResult('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {loading && <p>Compressing...</p>}
      <pre>{result}</pre>
    </div>
  );
}
```

---

## FAQ

### Do files get uploaded to your servers?

**No.** All compression happens in the user's browser using client-side JavaScript. Files never leave the device.

### Is this really free?

**Yes.** Since compression runs on the client, there are no server costs. The library is MIT licensed.

### Can I use this in production/commercial projects?

**Yes.** MIT licensed for any use.

### What browsers are supported?

Modern browsers with Canvas API and Web Workers support: Chrome 80+, Firefox 80+, Safari 14+, Edge 80+.

### How do I handle large files?

The SDK processes files in chunks and uses Web Workers to avoid blocking the UI. For very large files (50MB+), consider showing a progress indicator.

### Why isn't JPEG XL working?

JPEG XL has limited browser support. Use `checkFormatSupport()` to detect availability, and fall back to WebP or AVIF.

---

## Bundle Size

The SDK is tree-shakeable. Import only what you need:

```typescript
// Full bundle: ~150KB gzipped
import { compressImage, compressPDF, ... } from '@fileslim/compress';

// Minimal (images only): ~80KB gzipped
import { compressImage, formatFileSize } from '@fileslim/compress';
```

---

## License

MIT © [FileSlim](https://fileslim.com)

---

## Links

- [Website](https://fileslim.com)
- [GitHub](https://github.com/fileslim/sdk)
- [NPM](https://www.npmjs.com/package/@fileslim/compress)
- [Documentation](https://fileslim.com/sdk)
