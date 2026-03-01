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
  label: { ...fonts.bodyMedium, color: palette.textPrimary, marginBottom: spacing.sm },
  input: {
    backgroundColor: palette.inputBackground,
    borderRadius: radius.inner,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: palette.textPrimary,
    ...fonts.body,
  },
  inputError: { borderWidth: 1.5, borderColor: palette.danger },
  errorText: { ...fonts.caption, color: palette.danger, marginTop: spacing.xs },
});
