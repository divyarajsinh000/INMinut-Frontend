import type { MediaItem, Settings } from '@/api';
import { getMediaUrl } from '@/utils/media';

export const BUNDLED_NEWS_IMAGE = 'breaking_placeholder';

const resolveImage = (value?: string) => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path) return '';
  if (path.startsWith('//')) return `https:${path}`;
  return getMediaUrl(path.startsWith('uploads/') ? `/${path}` : path);
};

// Share-only fallback: never inject a settings image into article media.
export const getShareImageCandidates = (media?: MediaItem[], settings?: Settings | null) => {
  const candidates = [
    ...(media || []).filter(item => item.type === 'image' && !!item.url?.trim()).map(item => resolveImage(item.url)),
    resolveImage(settings?.defaultShareImage),
    BUNDLED_NEWS_IMAGE,
  ];
  return [...new Set(candidates.filter(Boolean))];
};
