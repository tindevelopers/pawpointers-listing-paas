/**
 * Example Tailwind Configuration
 * Shows how to integrate design tokens and SDK components
 */

const designTokens = require('@listing-platform/design-tokens/tailwind.config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use design tokens as base preset
  presets: [designTokens],
  
  content: [
    // Your app files
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    
    // SDK components (include in content for Tailwind to scan)
    './node_modules/@listing-platform/**/*.{js,ts,jsx,tsx}',
  ],
  
  theme: {
    extend: {
      // Your custom theme overrides
      colors: {
        // Override or extend design tokens
        brand: {
          primary: '#your-brand-color',
          secondary: '#your-secondary-color',
        },
      },
      
      // Add custom utilities
      fontFamily: {
        // Your custom fonts
      },
    },
  },
  
  plugins: [
    // Add Tailwind plugins as needed
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};

