/**
 * Design Tokens v5 — Clean Card + iOS Font Fix
 *
 * Cards: pure white, NO borders, iOS-optimized shadows (no Android elevation artifacts)
 * Fonts: SF Pro (iOS) / Roboto (Android) via Platform.select
 * Background: #EEF2F7 blue-gray
 * Radius: 24 cards, 14 inner
 */

import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// Font family — iOS system (SF Pro) or Roboto
// ═══════════════════════════════════════════════

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

// ═══════════════════════════════════════════════
// Surfaces
// ═══════════════════════════════════════════════

export const palette = {
  bgPrimary: '#EEF2F7',
  bgSecondary: '#FFFFFF',
  bgElevated: '#E8F0FE',
  bgHero: '#1E293B',
  bgHeroEnd: '#334155',

  textPrimary: '#1A1F36',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
  textOnDark: '#F1F5F9',
  textOnDarkMuted: 'rgba(241, 245, 249, 0.55)',

  borderSubtle: 'rgba(0, 0, 0, 0.03)',
  borderFocus: 'rgba(37, 99, 235, 0.12)',

  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primarySoft: 'rgba(37, 99, 235, 0.06)',
  primaryDark: '#1D4ED8',

  success: '#16A34A',
  successLight: '#F0FDF4',
  successSoft: 'rgba(22, 163, 74, 0.07)',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningSoft: 'rgba(245, 158, 11, 0.07)',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerSoft: 'rgba(239, 68, 68, 0.07)',
  info: '#3B82F6',
  infoLight: '#EFF6FF',

  easy: '#86EFAC',
  normal: '#93C5FD',
  hard: '#FDBA74',
  deload: '#C4B5FD',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.5)',

  accentAmber: '#F59E0B',
  accentGreen: '#16A34A',
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',

  iconTint: 'rgba(37, 99, 235, 0.05)',
  iconTintWarm: 'rgba(245, 158, 11, 0.07)',
  iconTintGreen: 'rgba(22, 163, 74, 0.07)',

  background: '#EEF2F7',
  surface: '#F1F5F9',
  card: '#FFFFFF',
  text: '#1A1F36',
  textSecondary2: '#4A5568',
  textTertiary: '#94A3B8',
  border: 'rgba(0, 0, 0, 0.03)',
  inputBackground: '#F5F7FA',
} as const;

// ═══════════════════════════════════════════════
// Spacing — 8pt grid
// ═══════════════════════════════════════════════

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  screenPadding: 20,
  sectionGap: 32,
  cardGap: 14,
  innerSm: 8,
  innerMd: 12,
  cardPadding: 20,
} as const;

// ═══════════════════════════════════════════════
// Radius
// ═══════════════════════════════════════════════

export const radius = {
  inner: 14,
  sm: 14,
  md: 14,
  lg: 24,
  xl: 24,
  card: 24,
  icon: 14,
  pill: 999,
  full: 999,
  tabBar: 24,
} as const;

// ═══════════════════════════════════════════════
// Shadows — iOS-only approach (no elevation = no Android border artifacts)
// ═══════════════════════════════════════════════

export const shadows = {
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 0,
  },
  focus: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 0,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 0,
  },
  button: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 0,
  },
} as const;

// ═══════════════════════════════════════════════
// Typography — iOS / SF Pro style
// ═══════════════════════════════════════════════

export const fonts = {
  heroNumber: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -1,
  },
  programDayTitle: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  screenTitle: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  cardValue: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  badge: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  tabular: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  button: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
} as const;
