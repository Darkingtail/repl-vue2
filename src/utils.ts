/**
 * Encode string to base64 (URL safe)
 */
export function utoa(data: string): string {
  const buffer = new TextEncoder().encode(data)
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode base64 to string (URL safe)
 */
export function atou(base64: string): string {
  // Restore standard base64
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if needed
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
