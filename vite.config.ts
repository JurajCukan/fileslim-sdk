import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FileSlimCompress',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'index.es.js';
        if (format === 'cjs') return 'index.cjs.js';
        return 'index.umd.js';
      }
    },
    rollupOptions: {
      external: [
        'browser-image-compression',
        'pdf-lib',
        '@jsquash/jpeg',
        '@jsquash/png',
        '@jsquash/webp'
      ],
      output: {
        globals: {
          'browser-image-compression': 'imageCompression',
          'pdf-lib': 'PDFLib',
          '@jsquash/jpeg': 'jsquashJpeg',
          '@jsquash/png': 'jsquashPng',
          '@jsquash/webp': 'jsquashWebp'
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
  }
});
