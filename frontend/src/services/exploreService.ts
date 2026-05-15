import api, { API_ORIGIN } from './api';

export type ExploreContent = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  summary?: string | null;
  content_type: 'ARTICLE' | 'VIDEO' | 'WORKSHOP' | 'SKILL' | string;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  badge_text?: string | null;
  badge_color?: string | null;
  icon_name?: string | null;
  icon_color?: string | null;
  icon_background_color?: string | null;
  content?: string | null;
  is_featured: boolean;
  display_order: number;
  published_at?: string | null;
};

export type ExploreCategory = {
  id: string;
  name: string;
  slug: string;
  category_type: string;
  description?: string | null;
  display_order: number;
  contents: ExploreContent[];
};

type ExploreResponse = {
  data: ExploreCategory[];
};

const normalizeContent = (content: ExploreContent): ExploreContent => ({
  ...content,
  thumbnail_url: toAbsoluteUrl(content.thumbnail_url),
});

const toAbsoluteUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

export const exploreService = {
  async getExplore() {
    const response = await api.get<ExploreResponse>('/explore');
    return response.data.data.map((category) => ({
      ...category,
      contents: category.contents.map(normalizeContent),
    }));
  },

  async getContent(slug: string) {
    const response = await api.get<ExploreContent>(`/explore/${encodeURIComponent(slug)}`);
    return normalizeContent(response.data);
  },

  async trackView(contentId: string, userId?: string) {
    await api.post(`/explore/${contentId}/view`, userId ? { user_id: userId } : {});
  },
};
