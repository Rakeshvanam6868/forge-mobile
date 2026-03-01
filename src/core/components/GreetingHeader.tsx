import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { palette, fonts, spacing } from '../../core/theme/designTokens';

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { text: 'Good evening', emoji: '🌅' };
  return { text: 'Good night', emoji: '🌙' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Personalized greeting header — shows time-of-day greeting + user name.
 */
export const GreetingHeader: React.FC = () => {
  const { user } = useAuth();
  const { text, emoji } = getGreeting();
  const name = user?.email?.split('@')[0] || 'there';
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.greeting}>
          {text}, {displayName} {emoji}
        </Text>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  left: { flex: 1 },
  greeting: {
    ...fonts.screenTitle,
    color: palette.textPrimary,
  },
  date: {
    ...fonts.caption,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.innerMd,
  },
  avatarText: {
    ...fonts.sectionHeader,
    color: palette.primary,
  },
});
