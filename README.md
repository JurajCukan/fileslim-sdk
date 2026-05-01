# @fileslim/compress

Client-side file compression. Zero servers, complete privacy.

[![npm version](https://img.shields.io/npm/v/@fileslim/compress.svg)](https://www.npmjs.com/package/@fileslim/compress)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🖼️ **Image compression** — JPEG, PNG, WebP, **AVIF** with quality control
- 🧠 **Best Algorithm mode** — tests candidate codecs in parallel and selects the smallest quality-safe output
- ⚙️ **Worker-pool engine** — uses browser workers and transferable buffers for app-matching compression
- 📄 **PDF compression** — Full embedded image recompression pipeline
- 📊 **Quality scoring** — Optional SSIM measurement with rating
- ⚡ **100% client-side** — No uploads, complete privacy
- 🎯 **Simple API** — 3 functions, 4 presets
- 📦 **Tiny bundle** — ~15KB gzipped (core)

## Install

```bash
npm install @fileslim/compress
```

### Optional: Better compression quality

Install @jsquash encoders for significantly better compression and Best Algorithm mode:

```bash
npm install @jsquash/jpeg @jsquash/png @jsquash/webp @jsquash/avif @jsquash/oxipng
```

The SDK automatically uses @jsquash when available and falls back to `browser-image-compression` otherwise. Add `@jsquash/jxl` too if you want optional JPEG XL candidate testing in browsers that support it.

## Quick Start

```javascript
import { compress, compressPDF, compressBatch } from '@fileslim/compress';

// Compress an image (auto-selects best format: AVIF > WebP > JPEG)
const result = await compress(file, { format: 'auto', mode: 'best' });
console.log(`Saved ${result.savings}%`); // "Saved 72%"

// Compress a PDF (full image recompression)
const pdf = await compressPDF(pdfFile, {
  mode: 'high',
  onProgress: (phase, pct) => console.log(`${phase}: ${pct}%`)
});

// Batch compress multiple files
const { results } = await compressBatch(files, { preset: 'web' });
```

## Presets

```javascript
const result = await compress(file, { preset: 'web' });
```

| Preset | Quality | Max Width | Format | Best For |
|--------|---------|-----------|--------|----------|
| `web` | 75% | 1920px | Auto (AVIF/WebP) | Websites |
| `social` | 80% | 1080px | JPEG | Instagram, Twitter |
| `email` | 65% | 800px | JPEG | Email attachments |
| `print` | 95% | No limit | Auto | Printing |

## Image Compression

```javascript
const result = await compress(file, {
  quality: 0.8,           // 0.0 - 1.0
  maxWidth: 1920,         // pixels (null = no resize)
  format: 'avif',         // 'auto' | 'jpeg' | 'png' | 'webp' | 'avif'
  stripMetadata: true,    // remove EXIF data (default: true)
  measureQuality: true,   // return SSIM score
  mode: 'best',           // use worker-pool Best Algorithm engine
  minSSIM: 0.9            // reject too-lossy smaller candidates
});

// Quality score (only when measureQuality: true)
console.log(result.qualityScore);
// { ssim: 0.97, rating: 'good' }
```

### Best Algorithm mode

Use `mode: 'best'` or `useBestAlgorithm: true` to match the FileSlim web app's current image engine. It analyzes the image, tests smart candidate formats in parallel via a worker pool, then returns the smallest result. When `measureQuality` is enabled, it can use `minSSIM` to choose the smallest candidate that still passes your quality threshold.

```javascript
const result = await compress(file, {
  mode: 'best',
  quality: 0.8,
  format: 'auto',
  measureQuality: true,
  minSSIM: 0.9,
  testAllFormats: true,
  onProgress: (event) => console.log(event.message)
});
```

### Format auto-detection

When `format: 'auto'` (default for `web` and `print` presets), the SDK picks the best format:

1. **AVIF** — if browser supports it (best compression)
2. **WebP** — universal modern fallback
3. **JPEG** — legacy fallback

### Encoder pipeline

The SDK uses a hybrid approach:

1. **Best Algorithm worker pool** — JPEG, WebP, AVIF, PNG, and optional JPEG XL candidates in parallel
2. **SSIM-aware selection** — optional quality thresholding with `measureQuality` + `minSSIM`
3. **Standard @jsquash path** — AVIF, JPEG, PNG, WebP when a specific format is requested
4. **browser-image-compression** — automatic fallback if @jsquash or workers are not available

## PDF Compression

PDF compression now includes a **full image extraction and recompression pipeline**:

```javascript
const pdf = await compressPDF(file, {
  mode: 'balanced',       // 'low' | 'balanced' | 'high' | 'maximum'
  imageQuality: 0.7,      // override mode default
  maxImageDimension: 1600, // max pixels for embedded images
  stripMetadata: true,     // remove title, author, etc.
  onProgress: (phase, percent) => {
    console.log(`${phase}: ${percent}%`);
  }
});
```

### PDF modes

| Mode | Image Quality | Max Dimension | Use Case |
|------|--------------|---------------|----------|
| `low` | 85% | 2000px | Print-safe, light compression |
| `balanced` | 70% | 1600px | Good balance (default) |
| `high` | 50% | 1200px | Aggressive, smaller files |
| `maximum` | 30% | 1000px | Smallest possible output |

### What the PDF pipeline does

1. **Extracts** all embedded images from the PDF
2. **Decodes** compressed image bytes to raw pixels
3. **Resizes** oversized images based on mode settings
4. **Recompresses** with @jsquash/jpeg (or canvas fallback)
5. **Replaces** images in the PDF only if smaller
6. **Strips** document metadata (title, author, keywords)
7. **Tries multiple save strategies** and picks the smallest

## Batch Processing

```javascript
const { results, errors } = await compressBatch(files, {
  preset: 'social',
  continueOnError: true,
  onProgress: (current, total) => {
    console.log(`Processing ${current}/${total}`);
  }
});
```

## Result Object

All functions return a `CompressedFile` object:

```typescript
interface CompressedFile {
  blob: Blob;              // The compressed file
  filename: string;        // Suggested filename
  originalSize: number;    // Bytes
  compressedSize: number;  // Bytes
  savings: number;         // Percentage (0-100)
  format: string;          // MIME type
  qualityScore?: {         // Only if measureQuality: true
    ssim: number;          // 0-1 (higher = better)
    rating: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
}

interface CompressOptions {
  mode?: 'standard' | 'best';
  useBestAlgorithm?: boolean;
  minSSIM?: number;
  testAllFormats?: boolean;
  onProgress?: (event) => void;
}
```

## Download Result

```javascript
const result = await compress(file);

const url = URL.createObjectURL(result.blob);
const a = document.createElement('a');
a.href = url;
a.download = result.filename;
a.click();
URL.revokeObjectURL(url);
```

## Browser Support

| Browser | Images | PDF | AVIF |
|---------|--------|-----|------|
| Chrome 89+ | ✅ | ✅ | ✅ |
| Firefox 93+ | ✅ | ✅ | ✅ (v93+) |
| Safari 16+ | ✅ | ✅ | ✅ (v16.4+) |
| Edge 89+ | ✅ | ✅ | ✅ |

## License

MIT © [Juraj Cukan](https://github.com/jurajcukan)

---

Made by [FileSlim](https://fileslim.com)
