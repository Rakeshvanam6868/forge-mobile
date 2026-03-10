import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { palette, fonts, spacing, radius, shadows } from '../../core/theme/designTokens';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'default' | 'small';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title, loading = false, variant = 'primary', size = 'default',
  disabled, style, ...props
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary && styles.primary,
        variant === 'outline' && styles.outline,
        isDanger && styles.danger,
        variant === 'secondary' && styles.secondary,
        size === 'small' && styles.small,
        disabled && styles.disabled,
        isPrimary && shadows.button,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.85}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? palette.white : palette.primary} size="small" />
      ) : (
        <Text style={[
          styles.text,
          isPrimary && styles.primaryText,
          variant === 'outline' && styles.outlineText,
          isDanger && styles.dangerText,
          variant === 'secondary' && styles.secondaryText,
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 12, 
    paddingHorizontal: 24,
    borderRadius: radius.md, // 12px
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    minHeight: 48,
  },
  primary: { 
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.50)',
    ...shadows.button,
  },
  secondary: { 
    backgroundColor: palette.bgElevated, // #111111
    borderWidth: 1,
    borderColor: palette.borderLight, // 1px solid white/0.1
  },
  outline: { 
    backgroundColor: 'transparent', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  danger: { backgroundColor: palette.danger },
  small: { paddingVertical: spacing.sm, minHeight: 36 },
  disabled: { opacity: 0.3, ...shadows.level1 },
  text: { ...fonts.button, letterSpacing: 0.2 },
  primaryText: { color: palette.white },
  secondaryText: { color: palette.white },
  outlineText: { color: palette.white },
  dangerText: { color: palette.white },
});
