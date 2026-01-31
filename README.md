# @fileslim/compress

Client-side file compression. Zero servers, complete privacy.

[![npm version](https://img.shields.io/npm/v/@fileslim/compress.svg)](https://www.npmjs.com/package/@fileslim/compress)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🖼️ **Image compression** - JPEG, PNG, WebP with quality control
- 📄 **PDF compression** - Reduce PDF size with embedded image optimization
- ⚡ **100% client-side** - No uploads, complete privacy
- 🎯 **Simple API** - 3 functions, 4 presets
- 📦 **Tiny bundle** - ~15KB gzipped (core)

## Install

```bash
npm install @fileslim/compress
```

## Quick Start

```javascript
import { compress, compressPDF, compressBatch } from '@fileslim/compress';

// Compress an image
const result = await compress(file);
console.log(`Saved ${result.savings}%`); // "Saved 65%"

// Compress a PDF
const pdf = await compressPDF(pdfFile);

// Batch compress multiple files
const { results } = await compressBatch(files);
```

## Presets

Use presets for quick, optimized configurations:

```javascript
const result = await compress(file, { preset: 'web' });
```

| Preset | Quality | Max Width | Format | Best For |
|--------|---------|-----------|--------|----------|
| `web` | 75% | 1920px | WebP | Websites |
| `social` | 80% | 1080px | JPEG | Instagram, Twitter |
| `email` | 65% | 800px | JPEG | Email attachments |
| `print` | 95% | No limit | Auto | Printing |

## Custom Options

```javascript
const result = await compress(file, {
  quality: 0.8,      // 0.0 - 1.0
  maxWidth: 1920,    // pixels (null = no resize)
  format: 'webp'     // 'auto' | 'jpeg' | 'png' | 'webp'
});
```

## PDF Compression

```javascript
const pdf = await compressPDF(file, { 
  mode: 'balanced'  // 'low' | 'balanced' | 'high' | 'maximum'
});
```

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
  blob: Blob;           // The compressed file
  filename: string;     // Suggested filename
  originalSize: number; // Bytes
  compressedSize: number; // Bytes
  savings: number;      // Percentage (0-100)
  format: string;       // MIME type
}
```

## Download Result

```javascript
const result = await compress(file);

// Create download link
const url = URL.createObjectURL(result.blob);
const a = document.createElement('a');
a.href = url;
a.download = result.filename;
a.click();
URL.revokeObjectURL(url);
```

## Browser Support

- Chrome 89+
- Firefox 93+
- Safari 16+
- Edge 89+

## Optional Dependencies

Install these for better compression quality:

```bash
npm install @jsquash/jpeg @jsquash/png @jsquash/webp
```

## License

MIT © [Juraj Cukan](https://github.com/jurajcukan)

---

Made with ❤️ by [FileSlim](https://fileslim.com)
