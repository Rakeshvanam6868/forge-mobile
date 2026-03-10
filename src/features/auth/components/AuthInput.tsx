import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({ label, error, ...props }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor={palette.textMuted}
      {...props}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg, width: '100%' },
  label: { ...fonts.label, color: palette.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: palette.bgInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: palette.textPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    ...fonts.body,
  },
  inputError: { borderColor: palette.danger },
  errorText: { ...fonts.caption, color: palette.danger, marginTop: spacing.xs },
});
