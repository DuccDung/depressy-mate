import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import googleServices from '../../google-services.json';

type GoogleServiceClient = {
  oauth_client?: Array<{
    client_id?: string;
    client_type?: number;
  }>;
  services?: {
    appinvite_service?: {
      other_platform_oauth_client?: Array<{
        client_id?: string;
        client_type?: number;
      }>;
    };
  };
};

type GoogleServicesConfig = {
  client?: GoogleServiceClient[];
};

const firebaseConfig = {
  apiKey: 'AIzaSyDvcLLsrUKUCDLoOVJJCSbkPG0mzN_VxSo',
  authDomain: 'depressy-mate.firebaseapp.com',
  projectId: 'depressy-mate',
  storageBucket: 'depressy-mate.firebasestorage.app',
  messagingSenderId: '209067163802',
  appId: '1:209067163802:web:c9218327134356f4b91f23',
  measurementId: 'G-NH0Z1JHCVQ',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let isGoogleSigninConfigured = false;

const getGoogleWebClientId = () => {
  const servicesConfig = googleServices as GoogleServicesConfig;
  const oauthClients = (servicesConfig.client || []).flatMap((client) => [
    ...(client.oauth_client || []),
    ...(client.services?.appinvite_service?.other_platform_oauth_client || []),
  ]);

  return oauthClients.find((client) => client.client_type === 3)?.client_id;
};

const configureGoogleSignin = () => {
  const webClientId = getGoogleWebClientId();

  if (!webClientId) {
    throw new Error(
      'Missing Google web client ID. Download google-services.json again from Firebase after adding SHA-1.'
    );
  }

  if (!isGoogleSigninConfigured) {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
    });
    isGoogleSigninConfigured = true;
  }

  return webClientId;
};

export const getGoogleIdToken = async () => {
  configureGoogleSignin();

  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSignin.signIn();
    const responseData = 'data' in response ? response.data : response;

    if (!responseData) {
      return null;
    }

    const idToken = responseData.idToken;
    if (!idToken) {
      throw new Error(
        'Google did not return an idToken. Check SHA-1, SHA-256, package name, and Web client ID in Firebase.'
      );
    }

    const auth = getAuth(firebaseApp);
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);

    return idToken;
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }

    throw error;
  }
};
