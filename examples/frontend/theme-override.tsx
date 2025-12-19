/**
 * Theme Override Examples
 * Shows how to customize design tokens for your brand
 */

import React from 'react';

// ============================================
// Method 1: CSS Variable Override
// ============================================

export function CSSVariableOverride() {
  return (
    <>
      {/* In your globals.css or component CSS */}
      <style jsx global>{`
        :root {
          /* Override primary colors */
          --color-primary-600: #your-brand-color;
          --color-primary-700: #your-brand-dark;
          
          /* Override fonts */
          --font-sans: 'Your Custom Font', sans-serif;
          
          /* Override spacing */
          --spacing-4: 1.5rem; /* Instead of 1rem */
        }
      `}</style>
      
      <div>
        <p className="text-primary-600">This uses your custom primary color</p>
      </div>
    </>
  );
}

// ============================================
// Method 2: Tailwind Config Override
// ============================================

/**
 * In your tailwind.config.js:
 * 
 * const designTokens = require('@listing-platform/design-tokens/tailwind.config');
 * 
 * module.exports = {
 *   presets: [designTokens],
 *   theme: {
 *     extend: {
 *       colors: {
 *         primary: {
 *           600: '#your-brand-color',
 *           700: '#your-brand-dark',
 *         },
 *         brand: {
 *           primary: '#your-color',
 *           secondary: '#your-color',
 *         },
 *       },
 *     },
 *   },
 * };
 */

// ============================================
// Method 3: Component-Level Override
// ============================================

import { ReviewsList } from '@listing-platform/reviews';

export function ComponentLevelOverride() {
  return (
    <div className="custom-brand-theme">
      {/* Use className to override specific components */}
      <ReviewsList 
        listingId="123"
        className="[&_.review-card]:bg-gradient-to-r [&_.review-card]:from-purple-500 [&_.review-card]:to-pink-500"
      />
    </div>
  );
}

// ============================================
// Method 4: Custom Theme Wrapper
// ============================================

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-custom">
      <style jsx global>{`
        .theme-custom {
          --color-primary-600: #6366f1;
          --color-primary-700: #4f46e5;
          --font-sans: 'Inter', sans-serif;
        }
        
        .theme-custom * {
          /* All components inherit custom theme */
        }
      `}</style>
      {children}
    </div>
  );
}

// ============================================
// Complete Example
// ============================================

export function ThemeOverrideExample() {
  return (
    <ThemeWrapper>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Custom Brand Theme</h1>
        <p className="text-primary-600 mb-4">
          This text uses your custom primary color
        </p>
        <ReviewsList listingId="123" />
      </div>
    </ThemeWrapper>
  );
}

