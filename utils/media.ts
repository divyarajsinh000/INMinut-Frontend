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
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

export const getMediaName = (item?: MediaItem) =>
  normalizeMediaName(item?.originalName) || `${item?.type || 'media'} file`;

export const getImageMedia = (media?: MediaItem[]) =>
  (media || []).filter((item) => item?.type === 'image' && !!item?.url);

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
