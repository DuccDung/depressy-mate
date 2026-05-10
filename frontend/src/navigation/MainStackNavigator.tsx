import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import { ChatDetailScreen } from '../screens/socials/ChatDetailScreen';
import { CreateGroupScreen } from '../screens/socials/CreateGroupScreen';
import { ConversationInfoScreen } from '../screens/socials/ConversationInfoScreen';
import { Colors } from '../../constants/theme';

export type MainStackParamList = {
  MainTabs: undefined;
  ChatDetail: {
    conversationId: string;
    title?: string;
  };
  CreateGroup: undefined;
  ConversationInfo: {
    conversationId: string;
  };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="ConversationInfo" component={ConversationInfoScreen} />
    </Stack.Navigator>
  );
}
