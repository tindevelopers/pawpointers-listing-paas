/**
 * Tailwind CSS configuration using design tokens
 * Use as a preset in your Tailwind config
 */

const { tokens } = require('./dist/index.js');

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        neutral: tokens.colors.neutral,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
      },
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize,
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      letterSpacing: tokens.typography.letterSpacing,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.shadows,
      screens: tokens.breakpoints,
      zIndex: tokens.zIndex,
      transitionDuration: tokens.transitions.duration,
      transitionTimingFunction: tokens.transitions.timing,
    },
  },
};

