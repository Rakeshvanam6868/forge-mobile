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
    paddingVertical: spacing.lg,
    borderRadius: radius.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    minHeight: 52,
  },
  primary: { backgroundColor: palette.primary },
  secondary: { backgroundColor: palette.primarySoft },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: palette.borderSubtle },
  danger: { backgroundColor: palette.danger },
  small: { paddingVertical: spacing.md, minHeight: 44 },
  disabled: { opacity: 0.5 },
  text: { ...fonts.button },
  primaryText: { color: palette.white },
  secondaryText: { color: palette.primary },
  outlineText: { color: palette.textSecondary },
  dangerText: { color: palette.white },
});
