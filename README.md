# @fileslim/compress

Client-side file compression. Zero servers, complete privacy.

[![npm version](https://img.shields.io/npm/v/@fileslim/compress.svg)](https://www.npmjs.com/package/@fileslim/compress)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 100% Client-Side - Files never leave the user's device
- Zero Server Costs - Uses client CPU, no infrastructure needed
- Simple API - 3 functions, 4 presets
- Modern Formats - JPEG, PNG, WebP support
- TypeScript Ready - Full type definitions included

## Install

npm install @fileslim/compress

## Quick Start

import { compress, compressPDF, compressBatch } from '@fileslim/compress';

// Compress an image
const result = await compress(file);
console.log(`Saved ${result.savings}%`);

// Compress a PDF
const pdf = await compressPDF(pdfFile);

// Batch compress multiple files
const { results } = await compressBatch(files);

## Presets

| Preset | Quality | Max Width | Format | Best For |
|--------|---------|-----------|--------|----------|
| web | 75% | 1920px | WebP | Websites |
| social | 80% | 1080px | JPEG | Instagram, Twitter |
| email | 65% | 800px | JPEG | Email attachments |
| print | 95% | No limit | Auto | Printing |

## Custom Options

const result = await compress(file, {
  quality: 0.8,
  maxWidth: 1920,
  format: 'webp'
});

## PDF Compression

const pdf = await compressPDF(file, { 
  mode: 'balanced'
});

## Batch Processing

const { results, errors } = await compressBatch(files, {
  preset: 'social',
  continueOnError: true,
  onProgress: (current, total) => {
    console.log(`Processing ${current}/${total}`);
  }
});

## Result Object

All functions return a CompressedFile object:

interface CompressedFile {
  blob: Blob;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savings: number;
  format: string;
}

## Browser Support

- Chrome 89+
- Firefox 93+
- Safari 16+
- Edge 89+

## Optional Dependencies

Install for better compression quality:

npm install @jsquash/jpeg @jsquash/png

## License

MIT

---

Made by [FileSlim](https://fileslim.com)
