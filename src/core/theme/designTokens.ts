/**
 * Design Tokens — Dark Theme SaaS Aesthetic
 *
 * Matches the TrainSmarter landing page:
 * - Pure black backgrounds layered with depth
 * - Ultra-thin borders (rgba 255,255,255,0.05)
 * - #FF3B3B red accent & glow shadows
 * - Inter/system fonts with strict typography scale
 */

import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// Font family — Inter/System
// ═══════════════════════════════════════════════

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

// ─── Surfaces & Colors ───────────────────────────
export const palette = {
  // Brand
  primary:       '#FF3B3B',   // Primary brand red
  primarySoft:   'rgba(255, 59, 59, 0.05)',
  primarySubtle: 'rgba(255, 59, 59, 0.1)',
  primaryGlow:   'rgba(255, 59, 59, 0.15)',
  
  // Backgrounds
  bgBase:        '#0B0B0B',   // Root screen background
  bgCard:        '#121212',   // Card background
  bgElevated:    '#1A1A1A',   // Moderately elevated
  bgInner:       '#161616',   // Inner containers
  bgInput:       '#0F0F0F',   // Input backgrounds
  
  // Borders
  borderSubtle:  '#242424',   // Standard card/section borders
  borderLight:   '#2A2A2A',   // Highlighted or interactive borders
  
  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#A1A1A1',   // Standard body/secondary text
  textMuted:     '#666666',   // Dimmed text
  
  // Semantic
  success: '#22C55E',
  successSubtle: 'rgba(34, 197, 94, 0.1)',
  warning: '#FBBF24',
  warningSubtle: 'rgba(251, 191, 36, 0.1)',
  info: '#3B82F6',
  danger: '#FF3B3B',
  dangerSubtle: 'rgba(255, 59, 59, 0.1)',
  accentAmber: '#FBBF24',
  
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ─── Typography ────────────────────────────────
export const fonts = {
  h1:             { fontFamily, fontSize: 28, fontWeight: '800' as const, color: palette.textPrimary, letterSpacing: -0.5 },
  h2:             { fontFamily, fontSize: 22, fontWeight: '700' as const, color: palette.textPrimary, letterSpacing: -0.3 },
  h3:             { fontFamily, fontSize: 18, fontWeight: '700' as const, color: palette.textPrimary },
  body:           { fontFamily, fontSize: 14, fontWeight: '400' as const, color: palette.textSecondary, lineHeight: 22 },
  label:          { fontFamily, fontSize: 12, fontWeight: '600' as const, color: palette.textSecondary, letterSpacing: 0.5 },
  labelXs:        { fontFamily, fontSize: 10, fontWeight: '700' as const, color: palette.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const },
  stat:           { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 24, fontWeight: '800' as const, color: palette.textPrimary },
  mono:           { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 14, fontWeight: '700' as const, color: palette.primary },
  button:         { fontFamily, fontSize: 15, fontWeight: '600' as const, color: palette.white },
} as const;

// ─── Spacing ──────────────────────────────────
// Consistent spacing tokens: 8, 12, 16, 24
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  
  // Layout specific
  screenPadding: 16,
  sectionGap: 24,
  cardGap: 12,
  cardPadding: 16,
  innerMd: 12,
} as const;

// ═══════════════════════════════════════════════
// Radius
// ═══════════════════════════════════════════════

export const radius = {
  sm:   8,
  md:   12,  // Buttons, inputs
  lg:   16,  // Cards, chart containers
  xl:   20,  // Large cards
  full: 9999, // Pills, badges
  pill: 9999,
  card: 16,
  icon: 12,
  inner: 8,
  tabBar: 24,
} as const;

// ═══════════════════════════════════════════════
// Shadows
// ═══════════════════════════════════════════════

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#FF3B3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  inner: {
    // Simulated
  },
  level1: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  level2: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  button: { shadowColor: '#FF3B3B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.39, shadowRadius: 14, elevation: 8 },
  focus: { shadowColor: '#FF3B3B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 8 },
  cardHover: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
} as const;
