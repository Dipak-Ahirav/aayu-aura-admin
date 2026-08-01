import { environment } from '../../../environments/environment';

function apiOrigin(): string {
  return new URL(environment.apiBaseUrl).origin;
}

export function productImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `${apiOrigin()}${url}`;
  }
  return url;
}
