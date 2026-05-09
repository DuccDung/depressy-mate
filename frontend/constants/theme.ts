/**
 * Design System: The Radiant Sanctuary
 * "Soft Minimalism", cognitive ease, emotional safety.
 */

export const Colors = {
  light: {
    // Brand Core
    primary: '#6B38D4', // Vibrant Purple
    primaryContainer: '#6287ccff',
    primaryIndigo: '#6C63FF', // Updated Indigo color
    secondary: '#006A63', // Mint
    secondaryFixed: '#79F7EA',

    // Surfaces & Backgrounds
    background: '#FFFFFF', // Pure White as requested
    surface: '#F7F9FB', // Base canvas
    surfaceContainerLowest: '#FFFFFF', // High-impact content cards (pop)
    surfaceContainerLow: '#F2F4F6', // Cards / minor lift
    surfaceContainerHigh: '#E6E8EA', // Recessive elements / secondary nav

    // Text & Outlines
    onSurface: '#191C1E', // Main text
    onSurfaceVariant: '#494454', // Body/long-form text
    outlineVariant: '#CBC3D7', // The "Ghost Border" (use at 15% opacity max)

    // Tints
    surfaceTint: '#6B38D4',

    // Semantic mappings for compatibility
    text: '#191C1E',
    icon: '#494454',
    surfaceContainer: '#F2F4F6',
    surfaceContainerHighest: '#DEE1E4',
  },
  dark: {
    // Auto-inverted or alternative palette can go here in the future
    // Following standard fallback structure for now
    primary: '#8455EF',
    primaryContainer: '#6B38D4',
    secondary: '#79F7EA',
    secondaryFixed: '#006A63',
    background: '#191C1E',
    surface: '#191C1E',
    surfaceContainerLowest: '#121212',
    surfaceContainerLow: '#2C2C2C',
    surfaceContainerHigh: '#3A3A3A',
    onSurface: '#F7F9FB',
    onSurfaceVariant: '#CBC3D7',
    outlineVariant: '#494454',
    surfaceTint: '#8455EF',

    // Semantic mappings for compatibility
    text: '#F7F9FB',
    icon: '#CBC3D7',
    surfaceContainer: '#2C2C2C',
    surfaceContainerHighest: '#454545',
  },
};

export const Typography = {
  fontFamily: 'Manrope', // Note: Manrope needs to be loaded via expo-font
  sizes: {
    display: 32, // Large empathetic moments
    headline: 24, // Anchors for sections
    body: 16,     // Long-form content
    label: 12,    // Small metadata
  },
  weights: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
  letterSpacing: {
    display: -0.5, // Tighter tracking (-2%)
    default: 0,
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  spacing4: 22, // ~1.4rem used for vertical white space between zero-divider list items
  lg: 24,
  xl: 32,
  xxl: 64,
  spacing16: 88, // ~5.5rem between distinct scrolling sections
};

export const BorderRadius = {
  sm: 8,       // 0.5rem - minimum absolute radius (No sharp 90-degree corners)
  md: 16,      // ROUND_SIXTEEN minimum, also Soft-pill shape input fields
  lg: 32,      // 2rem ROUND_LG
  xl: 48,      // 3rem ROUND_XL
  full: 9999,  // ROUND_FULL (buttons)
  pill: 9999,  // PILL shape
};

export const Shadows = {
  // Diffused shadow for floating CTAs
  ambient: {
    shadowColor: '#191C1E', // Tinted with primary contextually if needed
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 8, // Android fallback
  },
  // "Ghost Border" Fallback (15% opacity of outline_variant)
  ghostBorder: {
    borderWidth: 1,
    borderColor: 'rgba(203, 195, 215, 0.15)', // #CBC3D7 at 15%
  }
};

export const Gradients = {
  primary: ['#6B38D4', '#8455EF'] as const,
};
