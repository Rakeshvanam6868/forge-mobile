import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';
import { useSettingsStore } from '../../../core/stores/settingsStore';
import { useLayoutTokens } from '../../../core/theme/layout';

const WEIGHT_UNIT_KEY = 'ts_weight_unit';
const NOTIFICATIONS_KEY = 'ts_notifications_enabled';

type WeightUnit = 'kg' | 'lbs';

export const ProfileScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { scrollBottomPadding } = useLayoutTokens();

  const { weightUnit, toggleWeightUnit } = useSettingsStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const storedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (storedNotifications === 'true' || storedNotifications === 'false') {
          setNotificationsEnabled(storedNotifications === 'true');
        }
      } catch (e) {
        console.error('Failed to load profile prefs', e);
      } finally {
        setPrefsLoading(false);
      }
    };

    loadPrefs();
  }, []);

  const handleToggleUnit = () => {
    toggleWeightUnit();
  };

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(next));
    } catch (e) {
      console.error('Failed to persist notifications setting', e);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.signOut();
    } catch (e) {
      console.error('Logout failed:', e);
      setIsLoggingOut(false);
    }
  };

  const isLoading = authLoading || profileLoading || prefsLoading;

  const displayName =
    (user?.user_metadata as any)?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Athlete');

  const goalMap: Record<string, string> = {
    muscle_gain: 'Muscle Gain',
    fat_loss: 'Fat Loss',
    general_fitness: 'General Fitness',
    recomp: 'Body Recomposition',
  };

  const levelMap: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };

  const environmentMap: Record<string, string> = {
    home: 'Home',
    gym: 'Gym',
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* User Info */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>User</Text>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? 'No email'}</Text>
        </View>

        {/* Training Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Training Preferences</Text>
          <Row
            label="Goal"
            value={goalMap[profile?.goal ?? ''] ?? 'Not set'}
          />
          <Row
            label="Experience Level"
            value={levelMap[profile?.level ?? ''] ?? 'Not set'}
          />
          <Row
            label="Workout Location"
            value={environmentMap[profile?.environment ?? ''] ?? 'Not set'}
          />
        </View>

        {/* Units */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Units</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Weight</Text>
              <Text style={styles.rowValue}>{weightUnit.toUpperCase()}</Text>
            </View>
            <Switch
              value={weightUnit === 'lbs'}
              onValueChange={handleToggleUnit}
              thumbColor={palette.primary}
              trackColor={{ false: palette.borderSubtle, true: palette.primarySubtle }}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>App Settings</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowSub}>Placeholder toggle for future push alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              thumbColor={palette.primary}
              trackColor={{ false: palette.borderSubtle, true: palette.primarySubtle }}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Account</Text>
          <AuthButton
            title={isLoggingOut ? 'Logging out...' : 'Logout'}
            onPress={handleLogout}
            variant="outline"
            disabled={isLoggingOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bgBase,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingTop: 40,
    gap: spacing.lg,
  },
  title: {
    ...fonts.h1,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...fonts.label,
    color: palette.textSecondary,
    textTransform: 'uppercase',
  },
  name: {
    ...fonts.h2,
    color: palette.textPrimary,
  },
  email: {
    ...fonts.body,
    color: palette.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rowLabel: {
    ...fonts.body,
    color: palette.textSecondary,
  },
  rowValue: {
    ...fonts.body,
    color: palette.textPrimary,
    fontWeight: '600',
  },
  rowSub: {
    ...fonts.body,
    color: palette.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
});

