import api from './api';

export interface ProfileDetails {
  id: string;
  email: string;
  role: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  authProvider?: string | null;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export const profileService = {
  getMe: async (): Promise<ProfileDetails> => {
    const res = await api.get('/users/me');
    return res.data;
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<ProfileDetails> => {
    const res = await api.put('/users/me', payload);
    return res.data;
  },

  requestEmailVerificationOtp: async (email: string) => {
    const res = await api.post('/auth/email-verification/request-otp', { email });
    return res.data as { message: string; expiresInSeconds: number };
  },

  verifyEmailOtp: async (email: string, otp: string): Promise<ProfileDetails> => {
    const res = await api.post('/auth/email-verification/verify-otp', { email, otp });
    return res.data;
  },
};
