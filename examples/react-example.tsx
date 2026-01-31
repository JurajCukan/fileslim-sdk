/**
 * FileSlim SDK - React Example
 * 
 * This example shows how to integrate the FileSlim SDK into a React application.
 * 
 * Installation:
 *   npm install @fileslim/compress
 * 
 * Usage:
 *   Import and use this component in your React app
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  compressImage,
  compressImageAdvanced,
  compressPDF,
  compressBatch,
  compressionProfiles,
  formatFileSize,
  calculateSavings,
  downloadFile,
  checkFormatSupport,
  isImageFile,
  isPDFFile,
  type CompressionResult,
  type BatchCompressionProgress,
  type AdvancedCompressionOptions
} from '@fileslim/compress';

// ==========================================
// Simple Image Compressor Component
// ==========================================

interface CompressionState {
  status: 'idle' | 'compressing' | 'done' | 'error';
  originalSize: number;
  compressedSize: number;
  savings: number;
  error?: string;
}

export function SimpleImageCompressor() {
  const [state, setState] = useState<CompressionState>({
    status: 'idle',
    originalSize: 0,
    compressedSize: 0,
    savings: 0
  });
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [quality, setQuality] = useState(80);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isImageFile(file)) {
      setState(s => ({ ...s, status: 'error', error: 'Please select an image file' }));
      return;
    }

    setState(s => ({ ...s, status: 'compressing', originalSize: file.size }));

    try {
      const compressed = await compressImage(file, {
        quality: quality / 100,
        maxWidth: 1920,
        format: 'auto',
        removeMetadata: true
      });

      const savings = calculateSavings(file.size, compressed.size);
      
      setCompressedBlob(compressed);
      setState({
        status: 'done',
        originalSize: file.size,
        compressedSize: compressed.size,
        savings
      });
    } catch (error) {
      setState(s => ({
        ...s,
        status: 'error',
        error: error instanceof Error ? error.message : 'Compression failed'
      }));
    }
  };

  const handleDownload = () => {
    if (compressedBlob) {
      downloadFile(compressedBlob, 'compressed-image.webp');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Image Compressor</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Quality: {quality}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={quality}
          onChange={(e) => setQuality(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {state.status === 'compressing' && (
        <div className="mt-4 text-blue-600">Compressing...</div>
      )}
      
      {state.status === 'done' && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p><strong>Original:</strong> {formatFileSize(state.originalSize)}</p>
          <p><strong>Compressed:</strong> {formatFileSize(state.compressedSize)}</p>
          <p><strong>Saved:</strong> {state.savings.toFixed(1)}%</p>
          <button
            onClick={handleDownload}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download
          </button>
        </div>
      )}
      
      {state.status === 'error' && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {state.error}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Advanced Compressor with Quality Score
// ==========================================

export function AdvancedImageCompressor() {
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('web_optimized');

  const handleCompress = async (file: File) => {
    setLoading(true);
    
    try {
      const profile = compressionProfiles[selectedProfile];
      const compressionResult = await compressImageAdvanced(file, {
        ...profile.settings,
        calculateQualityScore: true
      });
      
      setResult(compressionResult);
    } catch (error) {
      console.error('Compression failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Advanced Compressor</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Profile</label>
        <select
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          className="w-full p-2 border rounded-lg"
        >
          {Object.entries(compressionProfiles).map(([key, profile]) => (
            <option key={key} value={key}>
              {profile.name} (~{profile.expectedSavings}% savings)
            </option>
          ))}
        </select>
      </div>
      
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleCompress(e.target.files[0])}
        className="block w-full mb-4"
      />
      
      {loading && <div className="text-blue-600">Compressing with quality analysis...</div>}
      
      {result && (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p><strong>Size:</strong> {formatFileSize(result.blob.size)}</p>
          </div>
          
          {result.qualityScore && (
            <div className={`p-4 rounded-lg ${
              result.qualityScore.rating === 'excellent' ? 'bg-green-50' :
              result.qualityScore.rating === 'good' ? 'bg-blue-50' :
              result.qualityScore.rating === 'acceptable' ? 'bg-yellow-50' :
              'bg-red-50'
            }`}>
              <p><strong>Quality Rating:</strong> {result.qualityScore.rating}</p>
              <p><strong>SSIM Score:</strong> {(result.qualityScore.score * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-1">{result.qualityScore.explanation}</p>
            </div>
          )}
          
          <button
            onClick={() => downloadFile(result.blob, 'compressed.webp')}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Batch Compressor with Progress
// ==========================================

export function BatchCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<BatchCompressionProgress | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).filter(isImageFile));
      setZipBlob(null);
    }
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    
    setIsCompressing(true);
    setProgress(null);
    
    try {
      const result = await compressBatch(
        files,
        compressionProfiles.web_optimized.settings,
        (p) => setProgress(p)
      );
      
      setZipBlob(result);
    } catch (error) {
      console.error('Batch compression failed:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Batch Compressor</h2>
      
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesChange}
        className="block w-full mb-4"
      />
      
      {files.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{files.length} files selected</p>
          <p className="text-sm text-gray-600">
            Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
          </p>
        </div>
      )}
      
      {progress && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {progress.current}/{progress.total}: {progress.fileName}
          </p>
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={handleCompress}
          disabled={files.length === 0 || isCompressing}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isCompressing ? 'Compressing...' : 'Compress All'}
        </button>
        
        {zipBlob && (
          <button
            onClick={() => downloadFile(zipBlob, 'compressed-images.zip')}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download ZIP ({formatFileSize(zipBlob.size)})
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PDF Compressor
// ==========================================

export function PDFCompressor() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isPDFFile(file)) {
      setStatus('Please select a PDF file');
      return;
    }

    setOriginalSize(file.size);
    setCompressedPdf(null);
    setStatus('Compressing...');

    try {
      const compressed = await compressPDF(file, 'balanced', {
        onProgress: (phase, pct) => {
          setStatus(phase);
          setProgress(pct);
        }
      });

      setCompressedPdf(compressed);
      setStatus('Done!');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">PDF Compressor</h2>
      
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="block w-full mb-4"
      />
      
      {status && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{status}</p>
          {progress > 0 && progress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      {compressedPdf && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p><strong>Original:</strong> {formatFileSize(originalSize)}</p>
          <p><strong>Compressed:</strong> {formatFileSize(compressedPdf.size)}</p>
          <p><strong>Saved:</strong> {calculateSavings(originalSize, compressedPdf.size).toFixed(1)}%</p>
          <button
            onClick={() => downloadFile(compressedPdf, 'compressed.pdf')}
            className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Browser Support Checker
// ==========================================

export function BrowserSupportChecker() {
  const support = checkFormatSupport();

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4">Browser Format Support</h2>
      <div className="space-y-2">
        {Object.entries(support).map(([format, supported]) => (
          <div key={format} className="flex justify-between">
            <span className="uppercase font-medium">{format}</span>
            <span className={supported ? 'text-green-600' : 'text-red-600'}>
              {supported ? '✓ Supported' : '✗ Not supported'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Main Demo App
// ==========================================

export default function FileSlimDemo() {
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced' | 'batch' | 'pdf'>('simple');

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-2">FileSlim SDK Demo</h1>
        <p className="text-center text-gray-600 mb-8">
          Client-side file compression in React
        </p>
        
        <div className="flex justify-center gap-2 mb-8">
          {(['simple', 'advanced', 'batch', 'pdf'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {activeTab === 'simple' && <SimpleImageCompressor />}
        {activeTab === 'advanced' && <AdvancedImageCompressor />}
        {activeTab === 'batch' && <BatchCompressor />}
        {activeTab === 'pdf' && <PDFCompressor />}
        
        <div className="mt-8">
          <BrowserSupportChecker />
        </div>
      </div>
    </div>
  );
}
