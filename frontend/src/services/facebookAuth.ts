import { AccessToken, LoginManager } from 'react-native-fbsdk-next';

export const getFacebookAccessToken = async () => {
  if (!LoginManager?.logInWithPermissions) {
    throw new Error(
      'Facebook SDK chưa được build vào app. Vui lòng rebuild development app bằng npx expo run:android rồi mở lại app mới.'
    );
  }

  const result = await LoginManager.logInWithPermissions(['public_profile']);
  if (result.isCancelled) {
    return null;
  }

  const data = await AccessToken.getCurrentAccessToken();
  const accessToken = data?.accessToken?.toString();

  if (!accessToken) {
    throw new Error('Không lấy được Facebook access token.');
  }

  return accessToken;
};
