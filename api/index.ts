import { logger } from '@/utils/logger';
import apiClient from './client';

export interface MediaItem {
  _id?: string;
  url: string;
  type: 'image' | 'video' | 'pdf';
  originalName?: string;
}

export interface City {
  _id: string;
  name: string;
  state?: { _id: string; name: string };
  country?: { _id: string; name: string };
}

export interface NewsItem {
  _id: string;
  title?: string;
  titleLink?: string;
  title_link?: string;
  description?: string;
  content?: string;
  category?: { _id: string; name: string; backgroundColor?: string; textColor?: string };
  cities?: City[];
  hashtags?: string[];
  publishedDate?: string;
  media?: MediaItem[];
  reporter?: { name?: string; avatar?: string };
  isBreaking?: boolean;
  breakingText?: string;
  titleColor?: string;
  titleFontSize?: number | string;
  descriptionFontSize?: number | string;
  breakingBgColor?: string;
  breakingTextColor?: string;
  isBreakingBlink?: boolean;
  isActive?: boolean;
  isPinned?: boolean;
  pinOrder?: number;
  sortOrder?: number;
  viewCount?: number;
  saveCount?: number;
  shareCount?: number;
}

export interface Ad {
  _id: string;
  name: string;
  label: string;
  bannerImage: string;
  redirectUrl: string;
  positionAfterNews: number;
  isEnabled: boolean;
  viewCount?: number;
  clickCount?: number;
}

export interface EmbedItem {
  _id: string;
  title: string;
  embedCode: string;
  height: number;
  positionAfterNews: number;
  isEnabled: boolean;
  viewCount?: number;
  clickCount?: number;
}

export interface RegisterGuestPayload {
  guestId: string;
  deviceId?: string;
  fcmToken?: string;
  expoPushToken?: string;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
  notificationsEnabled?: boolean;
  cityPreferences?: string[];
}

export interface Category {
  _id: string;
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

export const api = {
  getNews: async (params?: {
    category?: string;
    search?: string;
    cityIds?: string[];
  }) => {
    const response = await apiClient.get('/api/news', {
      params: {
        category: params?.category,
        search: params?.search,
        cityIds: params?.cityIds?.length ? JSON.stringify(params.cityIds) : undefined,
      },
    });
    return response.data.data as NewsItem[];
  },

  getNewsById: async (id: string) => {
    const response = await apiClient.get(`/api/news/${id}`);
    return response.data.data as NewsItem;
  },

  getAdvertisements: async () => {
    const response = await apiClient.get('/api/advertisements', {
      params: { enabledOnly: true },
    });
    return response.data.data as Ad[];
  },

  getEmbeds: async () => {
    const response = await apiClient.get('/api/embeds', {
      params: { enabledOnly: true },
    });
    return response.data.data as EmbedItem[];
  },

  getCategories: async () => {
    const response = await apiClient.get('/api/categories');
    return response.data.data as Category[];
  },

  getCities: async () => {
    const response = await apiClient.get('/api/locations/cities');
    return response.data.data as City[];
  },

registerGuestUser: async (payload: RegisterGuestPayload) => {
  logger('API registerGuestUser payload:', payload);

  const response = await apiClient.post('/api/guest-users/register', payload);

  logger('API registerGuestUser response:', response.data);

  return response.data.data;
},

  updateGuestNotificationPreference: async (guestId: string, notificationsEnabled: boolean, deviceId?: string) => {
    const response = await apiClient.patch(`/api/guest-users/${guestId}/preferences`, {
      notificationsEnabled,
      ...(deviceId ? { deviceId } : {}),
    });
    return response.data.data;
  },

  updateGuestCityPreferences: async (guestId: string, cityPreferences: string[]) => {
    const response = await apiClient.patch(`/api/guest-users/${guestId}/preferences`, {
      cityPreferences,
    });
    return response.data.data;
  },

  trackNewsInteraction: async (
    newsId: string,
    payload: { guestId: string; action: 'view' | 'save' | 'unsave' | 'share'; metadata?: Record<string, unknown> }
  ) => {
    const response = await apiClient.post(`/api/news/${newsId}/track`, payload);
    return response.data.data as {
      newsId: string;
      action: string;
      changed: boolean;
      viewCount: number;
      saveCount: number;
      shareCount: number;
    };
  },

  trackAdInteraction: async (
    adId: string,
    action: 'view' | 'click'
  ) => {
    const response = await apiClient.post(`/api/advertisements/${adId}/track`, { action });
    return response.data.data as {
      advertisementId: string;
      action: 'view' | 'click';
      viewCount: number;
      clickCount: number;
    };
  },

  trackEmbedInteraction: async (
    embedId: string,
    action: 'view' | 'click'
  ) => {
    const response = await apiClient.post(`/api/embeds/${embedId}/track`, { action });
    return response.data.data as {
      embedId: string;
      action: 'view' | 'click';
      viewCount: number;
      clickCount: number;
    };
  },
};
