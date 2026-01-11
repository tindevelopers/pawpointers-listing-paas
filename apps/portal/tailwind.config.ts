import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './layout/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'warm-primary': 'rgb(249, 115, 22)',
        'warm-primary-light': 'rgb(255, 237, 213)',
        'warm-primary-dark': 'rgb(194, 65, 12)',
        'accent-secondary': 'rgb(6, 182, 212)',
        'accent-secondary-light': 'rgb(207, 250, 254)',
        'status-success': 'rgb(34, 197, 94)',
        'status-warning': 'rgb(217, 119, 6)',
        'status-error': 'rgb(239, 68, 68)',
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
      animation: {
        slideInUp: 'slideInUp 0.3s ease-out',
        fadeIn: 'fadeIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
