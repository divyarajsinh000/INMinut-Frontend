import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MediaItem, NewsItem } from '@/api';
import { getMediaName, getMediaUrl } from '@/utils/media';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.news.brekingapp';

export type ShareNewsPayload = Pick<NewsItem, 'title' | 'description' | 'content' | 'media' | 'hashtags' | 'cities' | 'publishedDate'>;

type DownloadedFile = {
  uri: string;
  mimeType: string;
  name: string;
  type: MediaItem['type'];
};

const cleanFileName = (value?: string, fallback = 'media') => {
  const name = (value || fallback).split('/').pop() || fallback;
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const escapeHtml = (value?: string) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const extensionFromMedia = (item: MediaItem, index: number) => {
  const fromName = item.originalName?.split('.').pop();
  const fromUrl = item.url?.split('?')[0]?.split('.').pop();
  const ext = (fromName || fromUrl || '').toLowerCase();
  if (ext && ext.length <= 5) return ext;
  if (item.type === 'image') return 'jpg';
  if (item.type === 'video') return 'mp4';
  if (item.type === 'pdf') return 'pdf';
  return `file${index + 1}`;
};

const mimeFromMedia = (item: MediaItem, ext: string) => {
  if (item.type === 'image') return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (item.type === 'video') return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  if (item.type === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const normalizeMedia = (media?: MediaItem[], type?: MediaItem['type']) =>
  (media || []).filter((item) => !!item?.url && (!type || item.type === type));

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, '');
};

export const buildNewsPlainText = (payload: Partial<ShareNewsPayload>) => {
  const cityLine = payload.cities?.length
    ? `Cities: ${payload.cities.map((city) => city.name).join(', ')}`
    : 'Cities: All cities';
  const hashtagLine = payload.hashtags?.length ? `Hashtags: ${payload.hashtags.map((tag) => `#${tag}`).join(' ')}` : '';

  return [
    payload.title?.trim(),
    payload.description ? stripHtml(payload.description).trim() : undefined,
    payload.content?.trim(),
    cityLine,
    hashtagLine,
    APP_LINK,
  ]
    .filter(Boolean)
    .join('\n\n');
};

export const buildNewsShareMessage = buildNewsPlainText;

const downloadOneMediaFile = async (item: MediaItem, index = 0): Promise<DownloadedFile | null> => {
  const url = getMediaUrl(item.url);
  if (!url) return null;

  const ext = extensionFromMedia(item, index);
  const originalName = cleanFileName(item.originalName || `${item.type}_${index + 1}.${ext}`);
  const fileName = originalName.includes('.') ? originalName : `${originalName}.${ext}`;
  const localPath = `${FileSystem.cacheDirectory}news_share_${Date.now()}_${index}_${fileName}`;

  const downloaded = await FileSystem.downloadAsync(url, localPath);
  return {
    uri: downloaded.uri,
    mimeType: mimeFromMedia(item, ext),
    name: fileName,
    type: item.type,
  };
};

const cleanupFiles = async (uris: string[]) => {
  await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
};

export const shareTextOnly = async (payload: Partial<ShareNewsPayload>) => {
  await Share.share({ title: payload.title || 'News', message: buildNewsPlainText(payload) });
  return true;
};

export const copyNewsText = async (payload: Partial<ShareNewsPayload>) => {
  await Clipboard.setStringAsync(buildNewsPlainText(payload));
  Alert.alert('Copied', 'News text copied with proper formatting.');
  return true;
};

export const shareSingleMediaFile = async (item: MediaItem, title = 'Share media') => {
  if (Platform.OS === 'web') {
    await Share.share({ title, message: getMediaUrl(item.url) });
    return true;
  }

  const canShareFile = await Sharing.isAvailableAsync();
  if (!canShareFile) {
    await Share.share({ title, message: getMediaUrl(item.url) });
    return true;
  }

  const file = await downloadOneMediaFile(item);
  if (!file) return false;

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      dialogTitle: title,
      UTI: file.mimeType,
    });
    return true;
  } finally {
    await cleanupFiles([file.uri]);
  }
};

const mediaLinkListHtml = (items: MediaItem[], title: string) => {
  if (!items.length) return '';

  return `
    <div class="section">
      <h2>${escapeHtml(title)}</h2>
      ${items
        .map((item, index) => {
          const url = getMediaUrl(item.url);
          return `<p class="file-line"><strong>${index + 1}. ${escapeHtml(getMediaName(item))}</strong><br/><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
        })
        .join('')}
    </div>
  `;
};

const buildNewsPdfHtml = (payload: ShareNewsPayload) => {
  const images = normalizeMedia(payload.media, 'image');
  const videos = normalizeMedia(payload.media, 'video');
  const pdfs = normalizeMedia(payload.media, 'pdf');
  const cityText = payload.cities?.length ? payload.cities.map((city) => city.name).join(', ') : 'All cities';
  const hashtagText = payload.hashtags?.length ? payload.hashtags.map((tag) => `#${tag}`).join(' ') : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0F172A; background: #FFFFFF; }
          .header { border-bottom: 4px solid #0EA5E9; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { color: #0F3D8E; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 8px; }
          h1 { font-size: 28px; line-height: 1.25; margin: 0; color: #0B1E3F; }
          .description { margin-top: 14px; font-size: 17px; line-height: 1.55; color: #334155; font-weight: 600; }
          .meta { margin: 18px 0 0; padding: 12px 14px; border-radius: 14px; background: #EFF6FF; border: 1px solid #BAE6FD; font-size: 13px; color: #0F3D8E; line-height: 1.55; }
          .content { font-size: 15px; line-height: 1.75; white-space: pre-wrap; margin: 20px 0; }
          .section { margin-top: 24px; page-break-inside: avoid; }
          h2 { font-size: 18px; color: #0F3D8E; border-bottom: 1px solid #BAE6FD; padding-bottom: 8px; margin-bottom: 14px; }
          .image-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .image-card { border: 1px solid #BAE6FD; border-radius: 16px; overflow: hidden; background: #F8FAFC; page-break-inside: avoid; }
          .image-card img { width: 100%; height: 230px; object-fit: cover; display: block; }
          .caption { padding: 8px 10px; font-size: 11px; color: #475569; word-break: break-all; }
          .file-line { padding: 12px; border: 1px solid #BAE6FD; border-radius: 12px; background: #F8FAFC; font-size: 13px; line-height: 1.55; word-break: break-word; }
          a { color: #0369A1; text-decoration: none; }
          .footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Breking App News</div>
          <h1>${escapeHtml(payload.title)}</h1>
          ${payload.description ? `<div class="description">${payload.description}</div>` : ''}
          <div class="meta">
            <strong>Cities:</strong> ${escapeHtml(cityText)}${hashtagText ? `<br/><strong>Hashtags:</strong> ${escapeHtml(hashtagText)}` : ''}
          </div>
        </div>

        ${payload.content ? `<div class="content">${escapeHtml(payload.content)}</div>` : ''}

        ${images.length ? `
          <div class="section">
            <h2>Images</h2>
            <div class="image-grid">
              ${images
                .map((item) => {
                  const url = getMediaUrl(item.url);
                  return `<div class="image-card"><img src="${escapeHtml(url)}" /><div class="caption">${escapeHtml(getMediaName(item))}</div></div>`;
                })
                .join('')}
            </div>
          </div>` : ''}

        ${mediaLinkListHtml(pdfs, 'Attached PDFs')}
        ${mediaLinkListHtml(videos, 'Attached Videos')}

        <div class="footer">Shared from Breking App<br/>${escapeHtml(APP_LINK)}</div>
      </body>
    </html>
  `;
};

export const generateAndShareNewsPdf = async (payload: ShareNewsPayload) => {
  const canShareFile = await Sharing.isAvailableAsync();
  const html = buildNewsPdfHtml(payload);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (!canShareFile) {
    await Share.share({ title: payload.title, message: buildNewsPlainText(payload) });
    return true;
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: payload.title || 'Share news PDF',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } finally {
    await cleanupFiles([uri]);
  }
};



export const shareBrandedImageFile = async (imageUri: string, title = 'Share news image') => {
  if (Platform.OS === 'web') {
    await Share.share({ title, message: imageUri });
    return true;
  }

  const canShareFile = await Sharing.isAvailableAsync();
  if (!canShareFile) {
    await Share.share({ title, message: imageUri });
    return true;
  }

  await Sharing.shareAsync(imageUri, {
    mimeType: 'image/jpeg',
    dialogTitle: title,
    UTI: 'public.jpeg',
  });
  return true;
};

export const generateAndShareBrandedImage = async (payload: Partial<ShareNewsPayload>) => {
  const firstImage = normalizeMedia(payload.media, 'image')[0];
  if (!firstImage) return shareTextOnly(payload);

  // Fallback used by older screens that do not render the branded capture view.
  // NewsCard captures a real PNG with logo/footer and calls shareBrandedImageFile directly.
  return shareSingleMediaFile(firstImage, payload.title || 'Share news image');
};

export const shareNewsDirect = async (payload: ShareNewsPayload) => {
  const pdf = normalizeMedia(payload.media, 'pdf')[0];
  const video = normalizeMedia(payload.media, 'video')[0];
  const image = normalizeMedia(payload.media, 'image')[0];

  if (pdf) return shareSingleMediaFile(pdf, payload.title || 'Share PDF');
  if (video) return shareSingleMediaFile(video, payload.title || 'Share video');
  if (image) return generateAndShareBrandedImage(payload);

  return shareTextOnly(payload);
};


export const shareNewsItem = async (payload: ShareNewsPayload) => shareTextOnly(payload);

export const shareNews = async (title: string, description: string, mediaUrl?: string) => {
  return shareTextOnly({ title, description, media: mediaUrl ? [{ url: mediaUrl, type: 'image' }] : [] });
};

export const shareMedia = async (media: string | MediaItem, title = 'News media') => {
  const mediaItem: MediaItem = typeof media === 'string' ? { url: media, type: 'image' } : media;
  return shareSingleMediaFile(mediaItem, title);
};
