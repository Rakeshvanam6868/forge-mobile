import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../features/auth/hooks/useAuth';
import { useUserProfile } from '../features/onboarding/hooks/useUserProfile';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignupScreen } from '../features/auth/screens/SignupScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { TodayScreen } from '../features/program/screens/TodayScreen';
import { WeekScreen } from '../features/program/screens/WeekScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { AnalyticsScreen } from '../features/analytics/screens/AnalyticsScreen';
import { ProgressScreen } from '../features/progress/screens/ProgressScreen';
import { useRetention } from '../features/retention/hooks/useRetention';
import { WorkoutModeScreen } from '../features/workout/screens/WorkoutModeScreen';
import { WorkoutSummaryScreen } from '../features/workout/screens/WorkoutSummaryScreen';
import { palette, fonts, spacing, radius, shadows } from '../core/theme/designTokens';
import { useLayoutTokens } from '../core/theme/layout';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const TAB_ITEMS = [
  { name: 'Today', icon: 'fitness', component: TodayScreen },
  { name: 'Week', icon: 'calendar', component: WeekScreen },
  { name: 'Progress', icon: 'stats-chart', component: ProgressScreen },
  { name: 'Analytics', icon: 'pie-chart', component: AnalyticsScreen },
];

const AppTabs = () => {
  useRetention();
  const { tabBarHeight, tabBarBottom } = useLayoutTokens();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: tabBarBottom - 4,
          left: spacing.lg,
          right: spacing.lg,
          backgroundColor: 'rgba(15, 15, 15, 0.95)', 
          borderRadius: 15,
          height: tabBarHeight,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          ...shadows.level2,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: { ...fonts.labelXs, fontSize: 10, marginTop: 2 },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons 
                  name={focused ? tab.icon as any : `${tab.icon}-outline` as any} 
                  size={focused ? 24 : 22} 
                  color={color} 
                />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const MainNavigator = ({ hasProfile }: { hasProfile: boolean }) => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    {hasProfile ? (
      <>
        <MainStack.Screen name="MainTabs" component={AppTabs} />
        <MainStack.Screen
          name="WorkoutMode"
          component={WorkoutModeScreen}
          options={{ gestureEnabled: false, animation: 'slide_from_bottom' }}
        />
        <MainStack.Screen
          name="WorkoutSummary"
          component={WorkoutSummaryScreen}
          options={{ gestureEnabled: false }}
        />
      </>
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
    return <View style={styles.loadScreen}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  return (
    <NavigationContainer>
      {session ? <MainNavigator hasProfile={!!profile?.onboarding_completed} /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bgBase },
  tabIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  // tabIconActive: {
  //   backgroundColor: 'rgba(255, 59, 59, 0.05)',
  // },
});
