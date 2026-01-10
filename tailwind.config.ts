import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Söhne", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Söhne Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      colors: {
        // Anthropic Claude 亮色主题
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F4F1",
          tertiary: "#EFEEE9",
          cream: "#FAF9F6"
        },
        ink: {
          900: "#1A1915",
          800: "#2D2D2A",
          700: "#4A4A45",
          600: "#666661"
        },
        muted: {
          DEFAULT: "#6B6B66",
          light: "#9B9B96"
        },
        // Anthropic 橙棕色调 (Claude 标志性颜色)
        accent: {
          DEFAULT: "#D97757",
          hover: "#CC785C",
          light: "#F5D0C5",
          subtle: "#FDF4F1"
        },
        error: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2"
        },
        info: {
          DEFAULT: "#2563EB",
          light: "#DBEAFE"
        },
        "always-white": "hsl(var(--always-white) / <alpha-value>)",
        "always-black": "hsl(var(--always-black) / <alpha-value>)",
        "accent-brand": "hsl(var(--accent-brand) / <alpha-value>)",
        "accent-main": {
          "000": "hsl(var(--accent-main-000) / <alpha-value>)",
          "100": "hsl(var(--accent-main-100) / <alpha-value>)",
          "200": "hsl(var(--accent-main-200) / <alpha-value>)",
          "900": "hsl(var(--accent-main-900) / <alpha-value>)"
        },
        "accent-pro": {
          "000": "hsl(var(--accent-pro-000) / <alpha-value>)",
          "100": "hsl(var(--accent-pro-100) / <alpha-value>)",
          "200": "hsl(var(--accent-pro-200) / <alpha-value>)",
          "900": "hsl(var(--accent-pro-900) / <alpha-value>)"
        },
        "accent-secondary": {
          "000": "hsl(var(--accent-secondary-000) / <alpha-value>)",
          "100": "hsl(var(--accent-secondary-100) / <alpha-value>)",
          "200": "hsl(var(--accent-secondary-200) / <alpha-value>)",
          "900": "hsl(var(--accent-secondary-900) / <alpha-value>)"
        },
        bg: {
          "000": "hsl(var(--bg-000) / <alpha-value>)",
          "100": "hsl(var(--bg-100) / <alpha-value>)",
          "200": "hsl(var(--bg-200) / <alpha-value>)",
          "300": "hsl(var(--bg-300) / <alpha-value>)",
          "400": "hsl(var(--bg-400) / <alpha-value>)",
          "500": "hsl(var(--bg-500) / <alpha-value>)"
        },
        border: {
          "100": "hsl(var(--border-100) / <alpha-value>)",
          "200": "hsl(var(--border-200) / <alpha-value>)",
          "300": "hsl(var(--border-300) / <alpha-value>)",
          "400": "hsl(var(--border-400) / <alpha-value>)"
        },
        danger: {
          "000": "hsl(var(--danger-000) / <alpha-value>)",
          "100": "hsl(var(--danger-100) / <alpha-value>)",
          "200": "hsl(var(--danger-200) / <alpha-value>)",
          "900": "hsl(var(--danger-900) / <alpha-value>)"
        },
        oncolor: {
          "100": "hsl(var(--oncolor-100) / <alpha-value>)",
          "200": "hsl(var(--oncolor-200) / <alpha-value>)",
          "300": "hsl(var(--oncolor-300) / <alpha-value>)"
        },
        pictogram: {
          "100": "hsl(var(--pictogram-100) / <alpha-value>)",
          "200": "hsl(var(--pictogram-200) / <alpha-value>)",
          "300": "hsl(var(--pictogram-300) / <alpha-value>)",
          "400": "hsl(var(--pictogram-400) / <alpha-value>)"
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
          "000": "hsl(var(--success-000) / <alpha-value>)",
          "100": "hsl(var(--success-100) / <alpha-value>)",
          "200": "hsl(var(--success-200) / <alpha-value>)",
          "900": "hsl(var(--success-900) / <alpha-value>)"
        },
        text: {
          "000": "hsl(var(--text-000) / <alpha-value>)",
          "100": "hsl(var(--text-100) / <alpha-value>)",
          "200": "hsl(var(--text-200) / <alpha-value>)",
          "300": "hsl(var(--text-300) / <alpha-value>)",
          "400": "hsl(var(--text-400) / <alpha-value>)",
          "500": "hsl(var(--text-500) / <alpha-value>)"
        },
        warning: {
          "000": "hsl(var(--warning-000) / <alpha-value>)",
          "100": "hsl(var(--warning-100) / <alpha-value>)",
          "200": "hsl(var(--warning-200) / <alpha-value>)",
          "900": "hsl(var(--warning-900) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0, 0, 0, 0.05)",
        card: "0 4px 16px rgba(0, 0, 0, 0.08)",
        elevated: "0 8px 32px rgba(0, 0, 0, 0.12)"
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" }
        }
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
