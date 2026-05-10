import api from './api';

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: 'IMAGE' | 'VIDEO' | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  is_liked: boolean;
  is_saved: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  author_name: string;
  author_avatar: string | null;
  like_count: number;
  reply_count: number;
  is_liked: boolean;
  replies: Comment[];
}

export interface PagedResult<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

const userCache: Record<string, { full_name: string; avatar_url: string | null }> = {};

export const socialService = {
  getPosts: async (
    limit: number = 10,
    cursor?: string,
    savedOnly = false,
    userId?: string,
    mediaType?: 'IMAGE' | 'VIDEO',
  ): Promise<PagedResult<Post>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    if (savedOnly) params.append('savedOnly', 'true');
    if (userId) params.append('userId', userId);
    if (mediaType) params.append('mediaType', mediaType);

    const res = await api.get(`/posts?${params.toString()}`);
    return res.data;
  },

  getPost: async (postId: string): Promise<Post> => {
    const res = await api.get(`/posts/${postId}`);
    return res.data;
  },

  getUserPosts: async (userId: string, limit: number = 10, cursor?: string): Promise<PagedResult<Post>> => {
    return socialService.getPosts(limit, cursor, false, userId);
  },

  getVideoPosts: async (limit: number = 10, cursor?: string): Promise<PagedResult<Post>> => {
    return socialService.getPosts(limit, cursor, false, undefined, 'VIDEO');
  },

  getSavedPosts: async (limit: number = 10, cursor?: string): Promise<PagedResult<Post>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);

    const res = await api.get(`/posts/saved?${params.toString()}`);
    return res.data;
  },

  createPost: async (content: string, media_url?: string | null, media_type?: 'IMAGE' | 'VIDEO' | null): Promise<Post> => {
    const res = await api.post('/posts', {
      content,
      media_url: media_url || null,
      media_type: media_type || null,
    });
    return res.data;
  },

  uploadMedia: async (fileUri: string, fileName: string, contentType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: contentType,
    } as unknown as Blob);

    const res = await api.post('/upload/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as { publicUrl: string; path: string; mediaType: 'IMAGE' | 'VIDEO' };
  },

  getComments: async (postId: string, limit: number = 20, cursor?: string): Promise<PagedResult<Comment>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);

    const res = await api.get(`/posts/${postId}/comments?${params.toString()}`);
    return res.data;
  },

  toggleLike: async (postId: string) => {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data as { action: 'liked' | 'unliked'; like_count: number; is_liked: boolean };
  },

  toggleSave: async (postId: string) => {
    const res = await api.post(`/posts/${postId}/save`);
    return res.data as { action: 'saved' | 'unsaved'; is_saved: boolean };
  },

  createComment: async (postId: string, content: string, parentCommentId?: string | null): Promise<Comment> => {
    const res = await api.post(`/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentCommentId || null,
    });
    return res.data;
  },

  toggleCommentLike: async (postId: string, commentId: string) => {
    const res = await api.post(`/posts/${postId}/comments/${commentId}/like`);
    return res.data as { action: 'liked' | 'unliked'; like_count: number; is_liked: boolean };
  },

  requestUploadUrl: async () => {
    throw new Error('requestUploadUrl is deprecated. Use uploadMedia instead.');
  },

  uploadToStorage: async () => {
    throw new Error('uploadToStorage is deprecated. Use uploadMedia instead.');
  },

  getUserProfile: async (userId: string) => {
    if (userCache[userId]) {
      return userCache[userId];
    }
    const res = await api.get(`/users/${userId}`);
    userCache[userId] = res.data;
    return res.data;
  },
};
