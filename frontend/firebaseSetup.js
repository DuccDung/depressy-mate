import { initializeApp } from "firebase/app";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDvcLLsrUKUCDLoOVJJCSbkPG0mzN_VxSo",
  authDomain: "depressy-mate.firebaseapp.com",
  projectId: "depressy-mate",
  storageBucket: "depressy-mate.firebasestorage.app",
  messagingSenderId: "209067163802",
  appId: "1:209067163802:web:c9218327134356f4b91f23",
  measurementId: "G-NH0Z1JHCVQ",
};

const app = initializeApp(firebaseConfig);
// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
export default app;
