import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    })
  ],
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
        '@jsquash/png'
      ],
      output: {
        globals: {
          'browser-image-compression': 'imageCompression',
          'pdf-lib': 'PDFLib',
          '@jsquash/jpeg': 'jsquashJpeg',
          '@jsquash/png': 'jsquashPng'
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
