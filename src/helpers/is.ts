export const isArray = Array.isArray
export function isPrimitive(s: unknown): s is string | number {
  return typeof s === 'string' || typeof s === 'number'
}