import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import { ChatDetailScreen } from '../screens/socials/ChatDetailScreen';
import { CreateGroupScreen } from '../screens/socials/CreateGroupScreen';
import { ConversationInfoScreen } from '../screens/socials/ConversationInfoScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ExploreWebViewScreen from '../screens/ExploreWebViewScreen';
import ExploreContentDetailScreen from '../screens/ExploreContentDetailScreen';
import type { ExploreContent } from '../services/exploreService';
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
  Community: {
    initialTab?: 'community' | 'saved';
    focusPostId?: string;
  } | undefined;
  ExploreWebView: {
    title?: string;
    url: string;
  };
  ExploreContentDetail: {
    slug: string;
    initialContent?: ExploreContent;
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
      <Stack.Screen name="Community" component={ExploreScreen} />
      <Stack.Screen name="ExploreWebView" component={ExploreWebViewScreen} />
      <Stack.Screen name="ExploreContentDetail" component={ExploreContentDetailScreen} />
    </Stack.Navigator>
  );
}
