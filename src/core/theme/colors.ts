/**
 * Colors — re-exported from design tokens for backward compatibility.
 * All new code should import from designTokens directly.
 */
import { palette } from './designTokens';

export const colors = {
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primaryLight: palette.primaryLight,
  background: palette.background,
  surface: palette.surface,
  card: palette.card,
  text: palette.text,
  textSecondary: palette.textSecondary,
  textTertiary: palette.textTertiary,
  border: palette.border,
  error: palette.danger,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  inputBackground: palette.inputBackground,
};
