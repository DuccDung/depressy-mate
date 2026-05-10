import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "./App";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Nhan notification background:", remoteMessage);
});

registerRootComponent(App);
