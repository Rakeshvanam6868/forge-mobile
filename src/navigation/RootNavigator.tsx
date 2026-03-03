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
import { useRetention } from '../features/retention/hooks/useRetention';
import { seedExerciseDetails } from '../features/program/services/exerciseDetailsRepository';
import { palette, fonts, spacing, radius, shadows } from '../core/theme/designTokens';
import { TAB_BAR_HEIGHT } from '../core/theme/layout';

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
  { name: 'Today', icon: '🏋️', component: TodayScreen },
  { name: 'Week', icon: '📅', component: WeekScreen },
  { name: 'Progress', icon: '📊', component: HomeScreen },
  { name: 'Analytics', icon: '🎯', component: AnalyticsScreen },
];

const AppTabs = () => {
  useRetention();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 2,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(255,255,255,0.94)', 
          borderRadius: radius.tabBar,
          borderTopWidth: 0,
          height: TAB_BAR_HEIGHT,
          paddingTop: spacing.innerSm,
          paddingBottom: spacing.innerSm,
          ...shadows.level2,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { ...fonts.caption, fontSize: 10, marginTop: 2 },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Text style={styles.tabEmoji}>{tab.icon}</Text>
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

  React.useEffect(() => {
    // Only run seeder when auth session is fully ready to prevent RLS blocks
    if (session) {
      seedExerciseDetails().catch(() => {});
    }
  }, [session]);

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
  loadScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bgPrimary },
  tabIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: palette.primarySoft,
  },
  tabEmoji: { fontSize: 20 },
});
