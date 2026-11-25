import { API_BASE_URL } from '@/api/client';
import { MediaItem } from '@/api';

const looksLikeMojibake = (value: string) =>
  /[ÃÂÊËÎÏÔÛâãäåçèéêëìíîïñòóôõöùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßª«»¼½¾…]/.test(value);

export const normalizeMediaName = (value?: string) => {
  if (!value) return '';

  let name = String(value).trim();
  const fileName = name.split(/[\\/]/).pop() || name;

  try {
    name = decodeURIComponent(fileName);
  } catch {
    name = fileName;
  }

  if (looksLikeMojibake(name)) {
    try {
      const latin1Bytes = Uint8Array.from(
        [...name].map((char) => char.charCodeAt(0) & 0xff),
      );
      const decoded = new TextDecoder('utf-8').decode(latin1Bytes);
      if (decoded && decoded !== name) {
        return decoded;
      }
    } catch {
      // ignore and fall through
    }
  }

  return name;
};

export const getMediaUrl = (url?: string) => {
  if (typeof url !== 'string') return '';

  const value = url.trim();

  if (!value) return '';

  // Complete remote URL
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Protocol-relative URL
  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  // Local media URI
  if (/^(file:|content:|data:|blob:)/i.test(value)) {
    return value;
  }

  // Relative backend media URL
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');

  return `${baseUrl}/${value.replace(/^\/+/, '')}`;
};

export const getMediaName = (item?: MediaItem) =>
  normalizeMediaName(item?.originalName) || `${item?.type || 'media'} file`;

export const getImageMedia = (media?: MediaItem[]) =>
  (Array.isArray(media) ? media : []).filter(
    (item) =>
      item?.type === 'image' &&
      typeof item.url === 'string' &&
      item.url.trim().length > 0,
  );
// Animated GIFs are not reliably rendered by native view capture libraries.
// Keep them as their original file when sharing instead of turning them into a JPG.
export const isGifMedia = (item?: MediaItem) => {
  const fileName = `${item?.originalName || ''} ${item?.url || ''}`.split('?')[0];
  return /\.gif$/i.test(fileName);
};

export const getShareableMediaLines = (media?: MediaItem[]) =>
  (media || [])
    .filter((item) => !!item?.url)
    .map((item, index) => `${index + 1}. ${item.type.toUpperCase()}: ${getMediaUrl(item.url)}`);
