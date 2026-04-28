declare module '@jsquash/jpeg' {
  export function encode(data: ImageData, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}

declare module '@jsquash/png' {
  export function encode(data: ImageData, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}

declare module '@jsquash/webp' {
  export function encode(data: ImageData, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}

declare module '@jsquash/avif' {
  export function encode(data: ImageData, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}

declare module '@jsquash/oxipng' {
  export function optimise(buffer: ArrayBuffer, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}

declare module '@jsquash/jxl' {
  export function encode(data: ImageData, options?: Record<string, unknown>): Promise<ArrayBuffer>;
}
