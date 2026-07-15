import { StyleSheet } from 'react-native';

// ─── Joyful Wellness palette ───
export const palette = {
  primary: '#28A86B',
  primaryLight: '#DDF3E6',
  primaryDark: '#145C43',
  primaryMuted: '#28A86B24',

  accent: '#68BCEB',
  accentLight: '#E3F4FD',
  apricot: '#FF9D6C',
  lemon: '#FFD85A',
  sky: '#68BCEB',
  berry: '#E8759C',
  ink: '#16362C',
  cream: '#FFF9EC',

  // PFC colors
  protein: '#E8759C',
  fat: '#F4A340',
  carbs: '#68BCEB',
  fiber: '#28A86B',

  // Semantic
  success: '#28A86B',
  warning: '#F4A340',
  error: '#D85D5D',

  // Traffic light
  green: '#28A86B',
  amber: '#F4A340',
  red: '#D85D5D',

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
    bg: '#FFF9EC',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F1E5',
    text: '#16362C',
    textSecondary: '#66766F',
    textMuted: '#8D9993',
    border: '#E9E5D8',
    borderLight: '#F4F0E7',
    divider: '#E9E5D8',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E9E5D8',
    skeleton: '#ECE7DC',
    overlay: 'rgba(22, 54, 44, 0.04)',
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
  largeTitle: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6, lineHeight: 40 },
  title1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 34 },
  title2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
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
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

// ─── Gradients ───
export const gradients = {
  // Hero card — deep forest green
  heroPrimary: ['#064E3B', '#065F46'] as const,
  heroPrimaryDark: ['#145C43', '#1C7A52'] as const,
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
    shadowColor: '#6B5A37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  md: {
    shadowColor: '#6B5A37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  lg: {
    shadowColor: '#6B5A37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },

  // Section title
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0,
    marginBottom: spacing.md,
  },
});

// ─── Pressed opacity helper ───
export const pressed = (isPressed: boolean) => ({
  opacity: isPressed ? 0.7 : 1,
  transform: [{ scale: isPressed ? 0.98 : 1 }] as const,
});
