declare module '@jsquash/jpeg' {
  export function encode(data: ImageData, options?: { quality?: number }): Promise<ArrayBuffer>;
  export function decode(buffer: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/png' {
  export function encode(data: ImageData): Promise<ArrayBuffer>;
  export function decode(buffer: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/avif' {
  export function encode(data: ImageData, options?: { quality?: number }): Promise<ArrayBuffer>;
  export function decode(buffer: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/webp' {
  export function encode(data: ImageData, options?: { quality?: number }): Promise<ArrayBuffer>;
  export function decode(buffer: ArrayBuffer): Promise<ImageData>;
}
