import { env } from '../../config/env.js';

const uploadPathPattern = /\/uploads\/products\/[^/?#]+/;

export function storedProductImageUrl(filename: string): string {
  return `/uploads/products/${filename}`;
}

export function publicProductImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(uploadPathPattern);
  if (!match) return url;
  return new URL(match[0], env.APP_URL).toString();
}
