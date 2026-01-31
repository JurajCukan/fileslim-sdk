# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-02

### Added

- **Core Compression Functions**
  - `compressImage()` - Simple image compression with quality control
  - `compressImageAdvanced()` - Advanced compression with format conversion and dimension control
  - `compressPDF()` - PDF compression with multiple quality modes
  - `compressBatch()` - Batch compression into a single ZIP file
  - `compressBatchIndividual()` - Batch compression with individual file results

- **Format Support**
  - WebP compression and conversion
  - AVIF compression and conversion (where supported)
  - JPEG XL compression and conversion (where supported)
  - OxiPNG lossless PNG optimization
  - Standard JPEG/PNG compression

- **Format-Specific Functions**
  - `compressToWebP()` - Convert any image to WebP
  - `compressToAVIF()` - Convert any image to AVIF
  - `compressToJXL()` - Convert any image to JPEG XL
  - `compressPNG()` - Lossless PNG optimization

- **Compression Profiles**
  - `maximum` - Smallest file size (quality: 60)
  - `balanced` - Good balance of quality and size (quality: 75)
  - `quality` - Higher quality, larger files (quality: 85)
  - `lossless` - No quality loss, larger files (quality: 100)

- **Quality Assessment**
  - `calculateQualityScore()` - SSIM-based quality scoring
  - Perceptual quality metrics

- **Utility Functions**
  - `formatFileSize()` - Human-readable file size formatting
  - `downloadFile()` - Browser file download helper
  - `createZipFromFiles()` - Create ZIP archives from multiple files
  - `fileToBlob()` - Convert File to Blob
  - `blobToFile()` - Convert Blob to File
  - `getImageDimensions()` - Get image width and height

- **Browser Detection**
  - `checkFormatSupport()` - Check browser support for modern formats
  - `detectOptimalFormat()` - Auto-detect best format for current browser

- **Configuration**
  - Global `configure()` function for SDK-wide settings
  - Support for custom logging and debug mode

- **Build Formats**
  - ES Modules (index.js)
  - CommonJS (index.cjs)
  - UMD (index.umd.js) for browser script tags
  - Full TypeScript definitions

### Technical Details

- 100% client-side processing (no server required)
- Zero dependencies on external services
- Full TypeScript support with comprehensive type definitions
- Tree-shakeable ES module exports
- Works in all modern browsers (Chrome 80+, Firefox 75+, Safari 14+, Edge 80+)

---

## Future Releases

### Planned for v1.1.0

- [ ] Web Worker support for non-blocking compression
- [ ] Progress callbacks for large file processing
- [ ] Animated GIF/WebP support
- [ ] Image cropping before compression
- [ ] Watermark overlay option

### Planned for v1.2.0

- [ ] HEIC/HEIF input support
- [ ] SVG optimization
- [ ] PDF page extraction
- [ ] PDF merge functionality
- [ ] Custom compression presets
