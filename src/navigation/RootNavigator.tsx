import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { useAuth } from '../features/auth/hooks/useAuth';
import { useUserProfile } from '../features/onboarding/hooks/useUserProfile';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignupScreen } from '../features/auth/screens/SignupScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { TodayScreen } from '../features/program/screens/TodayScreen';
import { WeekScreen } from '../features/program/screens/WeekScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { AnalyticsScreen } from '../features/analytics/screens/AnalyticsScreen';
import { colors } from '../core/theme/colors';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

import { useRetention } from '../features/retention/hooks/useRetention';

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 11, color: focused ? colors.primary : colors.textSecondary, fontWeight: focused ? '700' : '400' }}>
    {label}
  </Text>
);

const AppTabs = () => {
  // Track APP_OPEN once per day
  useRetention();

  return (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingTop: 6,
        height: 56,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
    }}
  >
    <Tab.Screen
      name="Today"
      component={TodayScreen}
      options={{
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>🏋️</Text>,
        tabBarLabel: ({ focused }) => <TabIcon label="Today" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Week"
      component={WeekScreen}
      options={{
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>📅</Text>,
        tabBarLabel: ({ focused }) => <TabIcon label="Week" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Progress"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>📊</Text>,
        tabBarLabel: ({ focused }) => <TabIcon label="Progress" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>🎯</Text>,
        tabBarLabel: ({ focused }) => <TabIcon label="Analytics" focused={focused} />,
      }}
    />
  </Tab.Navigator>
  );
};
const MainNavigator = ({ hasProfile }: { hasProfile: boolean }) => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    {hasProfile ? (
      <MainStack.Screen name="AppTabs" component={AppTabs} />
    ) : (
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} />
    )}
  </MainStack.Navigator>
);

export const RootNavigator = () => {
  const { session, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();

  const isAppReady = !authLoading && (!session || !profileLoading);

  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainNavigator hasProfile={!!profile} /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
