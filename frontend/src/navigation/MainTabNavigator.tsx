import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import ContactScreen from '../screens/ContactScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import { MessengerScreen } from '../screens/socials/MessengerScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../../constants/theme';

export type MainTabParamList = {
  Home: undefined;
  Contact: undefined;
  Messenger: undefined;
  Chatbot: undefined;
  Explore: {
    initialTab?: 'learn' | 'community' | 'saved';
    focusPostId?: string;
  } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.surfaceContainerLowest,
          borderTopColor: Colors.light.outlineVariant,
          borderTopWidth: 1,
          height: 60 + Math.max(insets.bottom, 10), // Adding extra bottom padding if safearea is too small
          paddingBottom: 8 + Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'Manrope',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Contact':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Chatbot':
              iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
              break;
            case 'Messenger':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Explore':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Contact" component={ContactScreen} options={{ tabBarLabel: 'Liên hệ' }} />
      <Tab.Screen name="Messenger" component={MessengerScreen} options={{ tabBarLabel: 'Tin nhắn' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ tabBarLabel: 'Khám phá' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}
