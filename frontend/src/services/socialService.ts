import api from './api';

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  is_liked: boolean;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
}

// Memory Cache cho UserProfile để chống N+1 queries
const userCache: Record<string, { full_name: string, avatar_url: string | null }> = {};

export const socialService = {
  // 1. Fetch Feed (Lazy load)
  getPosts: async (limit: number = 5, cursor?: string) => {
    const url = `/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await api.get(url);
    return res.data; // { data: Post[], next_cursor: string, has_more: boolean }
  },

  // 2. Fetch Comments
  getComments: async (postId: string, limit: number = 20, cursor?: string) => {
    const url = `/posts/${postId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await api.get(url);
    return res.data;
  },

  // 3. Toggle Like
  toggleLike: async (postId: string) => {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data; // { action: 'liked' | 'unliked', like_count }
  },

  // 4. Create Comment
  createComment: async (postId: string, content: string) => {
    const res = await api.post(`/posts/${postId}/comments`, { content });
    return res.data; // Comment
  },

  // 5. Upload File (Presigned URL)
  requestUploadUrl: async (fileName: string, fileSize: number, contentType: string, mediaType: 'IMAGE' | 'VIDEO') => {
    const res = await api.post('/upload/request-url', {
      fileName,
      fileSize,
      contentType,
      mediaType,
    });
    return res.data; // { signedUrl, token, path, publicUrl }
  },

  // 6. Put raw buffer to storage
  uploadToStorage: async (signedUrl: string, fileUri: string, contentType: string) => {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    const putResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });
    
    if (!putResponse.ok) {
      throw new Error(`Upload failed with status ${putResponse.status}`);
    }
    return true;
  },

  // 7. Create Post metadata
  createPost: async (content: string, media_url: string, media_type: 'IMAGE' | 'VIDEO') => {
    const res = await api.post('/posts', { content, media_url, media_type });
    return res.data;
  },

  // 8. Fetch User Profile
  getUserProfile: async (userId: string) => {
    if (userCache[userId]) {
      return userCache[userId];
    }
    const res = await api.get(`/users/${userId}`);
    userCache[userId] = res.data;
    return res.data;
  }
};
