import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FileSlimCompress',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'index.es.js';
        return 'index.cjs.js';
      }
    },
    rollupOptions: {
      external: [
        'browser-image-compression',
        'pdf-lib',
        '@jsquash/jpeg',
        '@jsquash/png',
        '@jsquash/webp',
        '@jsquash/avif',
        '@jsquash/oxipng',
        '@jsquash/jxl',
        'jszip'
      ],
      output: {
        globals: {
          'browser-image-compression': 'imageCompression',
          'pdf-lib': 'PDFLib',
          '@jsquash/jpeg': 'jsquashJpeg',
          '@jsquash/png': 'jsquashPng',
          '@jsquash/webp': 'jsquashWebp',
          '@jsquash/avif': 'jsquashAvif',
          '@jsquash/oxipng': 'jsquashOxipng',
          '@jsquash/jxl': 'jsquashJxl'
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  worker: {
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
});