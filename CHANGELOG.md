# Changelog — @fileslim/compress

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Smoke test suite (vitest) covering exports, PRESETS, PDF_MODES, and utils
- `test`, `test:smoke`, `test:watch` npm scripts
- `prepublishOnly` now also runs the smoke tests
- CHANGELOG tracking for npm consumers

## [2.3.0] - 2026-05-01

### Added
- Batch compression helpers (`compressBatch`)
- Worker pool parallelization for multi-file image jobs
- Preset system for common use cases (`web`, `social`, `email`, `print`)
- DOCX presets (`email`, `balanced`, `quality`)

### Changed
- Build system emits both ESM (`index.es.js`) and CJS (`index.cjs.js`) outputs
- Improved performance on large file operations via worker pool

### Fixed
- JPEG quality preset inconsistency on mobile devices
- Memory leaks in worker cleanup

## [2.2.0] - 2026-04-15

### Added
- Email preset for inline image compression
- Print preset for high-quality delivery
- WebP format support

### Changed
- Updated `@jsquash/*` peer dependencies to latest versions

## [2.1.0] - 2026-04-01

### Initial public release

### Added
- Image compression (JPEG, PNG, WebP, AVIF)
- PDF compression via `pdf-lib`
- Async compression with progress callbacks
- TypeScript-first API
- 100% client-side processing — zero servers

---

## How to use this Changelog

1. **During development**: add changes under `[Unreleased]` using
   `Added`, `Changed`, `Fixed`, `Deprecated`, `Removed` categories.
2. **Before release**: copy `[Unreleased]` to a new dated version section,
   bump `package.json`, then clear `[Unreleased]`.
