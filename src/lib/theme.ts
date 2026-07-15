import { StyleSheet } from 'react-native';

// ─── Color Palette (Healthcare / Wellness) ───
export const palette = {
  // Primary: emerald green - fresh, healthy, motivating
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  primaryDark: '#059669',
  primaryMuted: '#10B98133',

  // Accent: blue for secondary actions
  accent: '#3B82F6',
  accentLight: '#DBEAFE',

  // PFC colors
  protein: '#6366F1', // indigo - distinct, premium feel
  fat: '#F59E0B',     // amber
  carbs: '#10B981',   // emerald (same as primary)
  fiber: '#8B5CF6',   // violet

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Traffic light
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',

  // Nutrient category colors
  calcium: '#06B6D4',
  iron: '#EF4444',
  vitaminA: '#F97316',
  vitaminE: '#84CC16',
  vitaminB1: '#FBBF24',
  vitaminB2: '#A3E635',
  vitaminC: '#FB923C',
  saturatedFat: '#F43F5E',
  salt: '#64748B',
  cholesterol: '#0EA5E9',

  // Nutrient detail section colors
  minerals: '#06B6D4',
  vitamins: '#F97316',
  fattyAcids: '#F43F5E',
  aminoAcids: '#6366F1',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ─── Theme Colors ───
export const colors = {
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E2E8F0',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    skeleton: '#E2E8F0',
    overlay: 'rgba(0, 0, 0, 0.04)',
  },
  dark: {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',
    tabBar: '#1E293B',
    tabBarBorder: '#334155',
    skeleton: '#334155',
    overlay: 'rgba(255, 255, 255, 0.04)',
  },
} as const;

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  divider: string;
  tabBar: string;
  tabBarBorder: string;
  skeleton: string;
  overlay: string;
};

export function useThemeColors(isDark: boolean): ThemeColors {
  return isDark ? colors.dark : colors.light;
}

// ─── Typography ───
export const typography = {
  largeTitle: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  title1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  title2: { fontSize: 18, fontWeight: '600' as const },
  title3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption1: { fontSize: 13, fontWeight: '500' as const },
  caption2: { fontSize: 11, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  number: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -1 },
  numberSmall: { fontSize: 20, fontWeight: '700' as const },
  heroNumber: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -2 },
  heroUnit: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.5 },
  display: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -1.5 },
} as const;

// ─── Spacing ───
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ─── Border Radius ───
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// ─── Gradients ───
export const gradients = {
  // Hero card — deep forest green
  heroPrimary: ['#064E3B', '#065F46'] as const,
  heroPrimaryDark: ['#022C22', '#064E3B'] as const,
  // Calorie over
  heroOver: ['#7C2D12', '#B45309'] as const,
  heroOverDark: ['#451A03', '#7C2D12'] as const,
  // Streak milestones
  streak7: ['#92400E', '#B45309'] as const,
  streak30: ['#374151', '#1F2937'] as const,
  // Premium
  premium: ['#1E1B4B', '#3730A3'] as const,
} as const;

// ─── Shadows ───
export const shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  hero: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroOver: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  }),
} as const;

// ─── Common Styles ───
export const commonStyles = StyleSheet.create({
  // Cards
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  cardCompact: {
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: palette.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
    ...shadow.colored(palette.primary),
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  buttonDestructive: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: palette.error,
  },
  buttonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },

  // Chips / Tags
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minHeight: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chipActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: palette.primaryDark,
    fontWeight: '600' as const,
  },

  // Inputs
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    minHeight: 48,
  },

  // Rows / Lists
  listItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    minHeight: 48,
  },

  // Scroll content
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },

  // Section title
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.md,
  },
});

// ─── Pressed opacity helper ───
export const pressed = (isPressed: boolean) => ({
  opacity: isPressed ? 0.7 : 1,
  transform: [{ scale: isPressed ? 0.98 : 1 }] as const,
});
