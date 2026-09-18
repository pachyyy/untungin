import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Aliases so existing class names keep working:
        bg: "hsl(var(--background))",
        ink: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted-foreground))", // text-muted -> grey text
          foreground: "hsl(var(--muted-foreground))",
          surface: "hsl(var(--muted))",
        },

        // "Liquid glass" redesign tokens — raw rgba/hex vars, see globals.css.
        "bg-base": "var(--bg-base)",
        panel: "var(--panel)",
        "panel-strong": "var(--panel-strong)",
        "panel-border": "var(--panel-border)",
        "glass-ink": {
          DEFAULT: "var(--glass-ink)",
          dim: "var(--glass-ink-dim)",
          faint: "var(--glass-ink-faint)",
        },
        "glass-accent": "var(--glass-accent)",
        "glass-accent2": "var(--glass-accent2)",
        "glass-success": "var(--glass-success)",
        "glass-warning": "var(--glass-warning)",
        "glass-danger": "var(--glass-danger)",
        "glass-divider": "var(--glass-divider)",
        "glass-input": "var(--glass-input-bg)",
        blob: {
          1: "var(--blob-1)",
          2: "var(--blob-2)",
          3: "var(--blob-3)",
          4: "var(--blob-4)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
