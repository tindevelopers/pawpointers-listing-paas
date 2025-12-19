/**
 * Design Tokens for Listing Platform
 * Provides colors, typography, spacing, shadows, and other design tokens
 */
export declare const tokens: {
    readonly colors: {
        readonly primary: {
            readonly 50: "#f0f9ff";
            readonly 100: "#e0f2fe";
            readonly 200: "#bae6fd";
            readonly 300: "#7dd3fc";
            readonly 400: "#38bdf8";
            readonly 500: "#0ea5e9";
            readonly 600: "#0284c7";
            readonly 700: "#0369a1";
            readonly 800: "#075985";
            readonly 900: "#0c4a6e";
            readonly 950: "#082f49";
        };
        readonly secondary: {
            readonly 50: "#faf5ff";
            readonly 100: "#f3e8ff";
            readonly 200: "#e9d5ff";
            readonly 300: "#d8b4fe";
            readonly 400: "#c084fc";
            readonly 500: "#a855f7";
            readonly 600: "#9333ea";
            readonly 700: "#7e22ce";
            readonly 800: "#6b21a8";
            readonly 900: "#581c87";
            readonly 950: "#3b0764";
        };
        readonly neutral: {
            readonly 50: "#fafafa";
            readonly 100: "#f5f5f5";
            readonly 200: "#e5e5e5";
            readonly 300: "#d4d4d4";
            readonly 400: "#a3a3a3";
            readonly 500: "#737373";
            readonly 600: "#525252";
            readonly 700: "#404040";
            readonly 800: "#262626";
            readonly 900: "#171717";
            readonly 950: "#0a0a0a";
        };
        readonly success: {
            readonly 50: "#f0fdf4";
            readonly 100: "#dcfce7";
            readonly 200: "#bbf7d0";
            readonly 300: "#86efac";
            readonly 400: "#4ade80";
            readonly 500: "#22c55e";
            readonly 600: "#16a34a";
            readonly 700: "#15803d";
            readonly 800: "#166534";
            readonly 900: "#14532d";
            readonly 950: "#052e16";
        };
        readonly warning: {
            readonly 50: "#fffbeb";
            readonly 100: "#fef3c7";
            readonly 200: "#fde68a";
            readonly 300: "#fcd34d";
            readonly 400: "#fbbf24";
            readonly 500: "#f59e0b";
            readonly 600: "#d97706";
            readonly 700: "#b45309";
            readonly 800: "#92400e";
            readonly 900: "#78350f";
            readonly 950: "#451a03";
        };
        readonly error: {
            readonly 50: "#fef2f2";
            readonly 100: "#fee2e2";
            readonly 200: "#fecaca";
            readonly 300: "#fca5a5";
            readonly 400: "#f87171";
            readonly 500: "#ef4444";
            readonly 600: "#dc2626";
            readonly 700: "#b91c1c";
            readonly 800: "#991b1b";
            readonly 900: "#7f1d1d";
            readonly 950: "#450a0a";
        };
        readonly info: {
            readonly 50: "#eff6ff";
            readonly 100: "#dbeafe";
            readonly 200: "#bfdbfe";
            readonly 300: "#93c5fd";
            readonly 400: "#60a5fa";
            readonly 500: "#3b82f6";
            readonly 600: "#2563eb";
            readonly 700: "#1d4ed8";
            readonly 800: "#1e40af";
            readonly 900: "#1e3a8a";
            readonly 950: "#172554";
        };
    };
    readonly typography: {
        readonly fontFamily: {
            readonly sans: readonly ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"];
            readonly serif: readonly ["Georgia", "Cambria", "Times New Roman", "Times", "serif"];
            readonly mono: readonly ["Fira Code", "Menlo", "Monaco", "Consolas", "monospace"];
        };
        readonly fontSize: {
            readonly xs: "0.75rem";
            readonly sm: "0.875rem";
            readonly base: "1rem";
            readonly lg: "1.125rem";
            readonly xl: "1.25rem";
            readonly '2xl': "1.5rem";
            readonly '3xl': "1.875rem";
            readonly '4xl': "2.25rem";
            readonly '5xl': "3rem";
            readonly '6xl': "3.75rem";
            readonly '7xl': "4.5rem";
            readonly '8xl': "6rem";
            readonly '9xl': "8rem";
        };
        readonly fontWeight: {
            readonly thin: 100;
            readonly extralight: 200;
            readonly light: 300;
            readonly normal: 400;
            readonly medium: 500;
            readonly semibold: 600;
            readonly bold: 700;
            readonly extrabold: 800;
            readonly black: 900;
        };
        readonly lineHeight: {
            readonly none: 1;
            readonly tight: 1.25;
            readonly snug: 1.375;
            readonly normal: 1.5;
            readonly relaxed: 1.625;
            readonly loose: 2;
        };
        readonly letterSpacing: {
            readonly tighter: "-0.05em";
            readonly tight: "-0.025em";
            readonly normal: "0em";
            readonly wide: "0.025em";
            readonly wider: "0.05em";
            readonly widest: "0.1em";
        };
    };
    readonly spacing: {
        readonly 0: "0";
        readonly 1: "0.25rem";
        readonly 2: "0.5rem";
        readonly 3: "0.75rem";
        readonly 4: "1rem";
        readonly 5: "1.25rem";
        readonly 6: "1.5rem";
        readonly 7: "1.75rem";
        readonly 8: "2rem";
        readonly 9: "2.25rem";
        readonly 10: "2.5rem";
        readonly 11: "2.75rem";
        readonly 12: "3rem";
        readonly 14: "3.5rem";
        readonly 16: "4rem";
        readonly 20: "5rem";
        readonly 24: "6rem";
        readonly 28: "7rem";
        readonly 32: "8rem";
        readonly 36: "9rem";
        readonly 40: "10rem";
        readonly 44: "11rem";
        readonly 48: "12rem";
        readonly 52: "13rem";
        readonly 56: "14rem";
        readonly 60: "15rem";
        readonly 64: "16rem";
        readonly 72: "18rem";
        readonly 80: "20rem";
        readonly 96: "24rem";
    };
    readonly borderRadius: {
        readonly none: "0";
        readonly sm: "0.125rem";
        readonly md: "0.375rem";
        readonly lg: "0.5rem";
        readonly xl: "0.75rem";
        readonly '2xl': "1rem";
        readonly '3xl': "1.5rem";
        readonly full: "9999px";
    };
    readonly shadows: {
        readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
        readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
        readonly '2xl': "0 25px 50px -12px rgb(0 0 0 / 0.25)";
        readonly inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)";
        readonly none: "none";
    };
    readonly breakpoints: {
        readonly sm: "640px";
        readonly md: "768px";
        readonly lg: "1024px";
        readonly xl: "1280px";
        readonly '2xl': "1536px";
    };
    readonly zIndex: {
        readonly 0: 0;
        readonly 10: 10;
        readonly 20: 20;
        readonly 30: 30;
        readonly 40: 40;
        readonly 50: 50;
        readonly auto: "auto";
        readonly dropdown: 1000;
        readonly sticky: 1020;
        readonly fixed: 1030;
        readonly modalBackdrop: 1040;
        readonly modal: 1050;
        readonly popover: 1060;
        readonly tooltip: 1070;
    };
    readonly transitions: {
        readonly duration: {
            readonly fast: "150ms";
            readonly base: "200ms";
            readonly slow: "300ms";
            readonly slower: "500ms";
        };
        readonly timing: {
            readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly 'ease-in': "cubic-bezier(0.4, 0, 1, 1)";
            readonly 'ease-out': "cubic-bezier(0, 0, 0.2, 1)";
            readonly 'ease-in-out': "cubic-bezier(0.4, 0, 0.2, 1)";
        };
    };
};
export type DesignTokens = typeof tokens;
export type ColorScale = keyof typeof tokens.colors;
export type ColorValue = typeof tokens.colors.primary;
//# sourceMappingURL=tokens.d.ts.map