import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface SocialUser {
  name: string;
  email: string;
  avatar: string;
}

/**
 * Service to handle generic logic after social login success
 */
export const AuthService = {
  /**
   * Fetch user profile from Google using the access token
   */
  async fetchGoogleUserInfo(accessToken: string): Promise<SocialUser | null> {
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await response.json();
      return {
        name: user.name,
        email: user.email,
        avatar: user.picture,
      };
    } catch {
      return null;
    }
  },

  /**
   * Fetch user profile from Facebook using the access token
   */
  async fetchFacebookUserInfo(accessToken: string): Promise<SocialUser | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture.type(large)`
      );
      const user = await response.json();
      return {
        name: user.name,
        email: user.email,
        avatar: user.picture?.data?.url,
      };
    } catch {
      return null;
    }
  },

  /**
   * Display welcome message
   */
  showWelcomeMessage(user: SocialUser) {
    Alert.alert('Đăng nhập thành công', `Chào mừng ${user.name} đã quay trở lại!`);
  },
};
