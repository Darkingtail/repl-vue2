import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'

// Prefix to identify encoding type
const LZ_PREFIX = '0' // lz-string compressed
const B64_PREFIX = '1' // base64 encoded

/**
 * Encode string to URL-safe base64
 */
function toBase64(data: string): string {
  const buffer = new TextEncoder().encode(data)
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode URL-safe base64 to string
 */
function fromBase64(base64: string): string {
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Compress and encode string for URL
 * Automatically chooses the shorter encoding (lz-string or base64)
 */
export function utoa(data: string): string {
  const compressed = compressToEncodedURIComponent(data)
  const base64 = toBase64(data)

  // Choose shorter one with prefix
  if (compressed.length < base64.length) {
    return LZ_PREFIX + compressed
  }
  return B64_PREFIX + base64
}

/**
 * Decompress and decode string from URL
 * Automatically detects encoding type
 */
export function atou(encoded: string): string {
  if (!encoded || encoded.length < 2) {
    throw new Error('Invalid encoded data')
  }

  const prefix = encoded[0]
  const data = encoded.slice(1)

  if (prefix === LZ_PREFIX) {
    const result = decompressFromEncodedURIComponent(data)
    if (result === null) {
      throw new Error('Failed to decompress lz-string data')
    }
    return result
  }

  if (prefix === B64_PREFIX) {
    return fromBase64(data)
  }

  // Fallback: try lz-string first (for backward compatibility with old format)
  const result = decompressFromEncodedURIComponent(encoded)
  if (result !== null) {
    return result
  }

  // Try base64
  try {
    return fromBase64(encoded)
  } catch {
    throw new Error('Failed to decode data: unknown format')
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

/**
 * Generate a simple hash from string
 */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Check if filename is a Vue SFC
 */
export function isVueSFC(filename: string): boolean {
  return filename.endsWith('.vue')
}

/**
 * Check if filename is TypeScript
 */
export function isTS(filename: string): boolean {
  return /\.tsx?$/.test(filename)
}

/**
 * Check if filename is JSX/TSX
 */
export function isJSX(filename: string): boolean {
  return /\.[jt]sx$/.test(filename)
}

/**
 * Check if filename is JavaScript/TypeScript
 */
export function isJS(filename: string): boolean {
  return /\.[jt]sx?$/.test(filename)
}

/**
 * Check if filename is CSS
 */
export function isCSS(filename: string): boolean {
  return filename.endsWith('.css')
}

/**
 * Check if filename is JSON
 */
export function isJSON(filename: string): boolean {
  return filename.endsWith('.json')
}

/**
 * Get file extension
 */
export function getExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1] : ''
}

/**
 * Strip src/ prefix from filename
 */
export function stripSrcPrefix(filename: string): string {
  return filename.replace(/^src\//, '')
}

/**
 * Add src/ prefix to filename if needed
 */
export function addSrcPrefix(filename: string): string {
  if (filename === 'import-map.json' || filename.startsWith('src/')) {
    return filename
  }
  return `src/${filename}`
}
