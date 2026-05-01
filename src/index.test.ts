import { describe, it, expect } from 'vitest';
import type { CompressedFile, CompressOptions, PresetConfig } from './types';

describe('FileSlim SDK Smoke Tests', () => {
  describe('Exports', () => {
    it('compress is exported', async () => {
      const { compress } = await import('./index');
      expect(typeof compress).toBe('function');
    });

    it('compressPDF is exported', async () => {
      const { compressPDF } = await import('./index');
      expect(typeof compressPDF).toBe('function');
    });

    it('compressBatch is exported', async () => {
      const { compressBatch } = await import('./index');
      expect(typeof compressBatch).toBe('function');
    });

    it('PRESETS / PDF_MODES / DOCX_PRESETS are exported', async () => {
      const m = await import('./index');
      expect(m.PRESETS).toBeDefined();
      expect(m.PDF_MODES).toBeDefined();
      expect(m.DOCX_PRESETS).toBeDefined();
    });

    it('utils are exported', async () => {
      const { formatSize, calculateSavings } = await import('./index');
      expect(typeof formatSize).toBe('function');
      expect(typeof calculateSavings).toBe('function');
    });
  });

  describe('PRESETS', () => {
    it('contains web/social/email/print', async () => {
      const { PRESETS } = await import('./index');
      ['web', 'social', 'email', 'print'].forEach((k) =>
        expect(PRESETS).toHaveProperty(k)
      );
    });

    it('each preset has quality/maxWidth/format', async () => {
      const { PRESETS } = await import('./index');
      Object.values(PRESETS).forEach((p) => {
        const preset = p as PresetConfig;
        expect(preset).toHaveProperty('quality');
        expect(preset).toHaveProperty('maxWidth');
        expect(preset).toHaveProperty('format');
        expect(preset.quality).toBeGreaterThan(0);
        expect(preset.quality).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('PDF_MODES', () => {
    it('contains low/balanced/high/maximum', async () => {
      const { PDF_MODES } = await import('./index');
      ['low', 'balanced', 'high', 'maximum'].forEach((k) =>
        expect(PDF_MODES).toHaveProperty(k)
      );
    });
  });

  describe('utils behavior', () => {
    it('formatSize formats bytes', async () => {
      const { formatSize } = await import('./index');
      expect(typeof formatSize(1024)).toBe('string');
      expect(formatSize(0)).toBe('0 B');
    });

    it('calculateSavings computes percentage', async () => {
      const { calculateSavings } = await import('./index');
      expect(calculateSavings(100, 25)).toBe(75);
      expect(calculateSavings(0, 0)).toBe(0);
    });
  });

  describe('Types', () => {
    it('CompressedFile shape compiles', () => {
      const r: CompressedFile = {
        blob: new Blob(['x']),
        filename: 'x.jpg',
        originalSize: 100,
        compressedSize: 50,
        savings: 50,
        format: 'image/jpeg'
      };
      expect(r.savings).toBe(50);
    });

    it('CompressOptions shape compiles', () => {
      const o: CompressOptions = { quality: 0.8, maxWidth: 1920, format: 'webp' };
      expect(o.quality).toBe(0.8);
    });
  });
});
