import { API_BASE_URL } from '@/api/client';
import { MediaItem } from '@/api';

export const getMediaUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

export const getMediaName = (item?: MediaItem) =>
  item?.originalName || `${item?.type || 'media'} file`;

export const getImageMedia = (media?: MediaItem[]) =>
  (media || []).filter((item) => item?.type === 'image' && !!item?.url);

export const getShareableMediaLines = (media?: MediaItem[]) =>
  (media || [])
    .filter((item) => !!item?.url)
    .map((item, index) => `${index + 1}. ${item.type.toUpperCase()}: ${getMediaUrl(item.url)}`);
