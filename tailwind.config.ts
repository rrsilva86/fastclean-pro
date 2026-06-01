import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#06B6D4",
        secondary: "#14B8A6",
        accent: "#99F6E4",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        app: {
          background: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)",
        premium: "0 18px 45px rgba(15, 23, 42, 0.08)",
        glow: "0 18px 40px rgba(6, 182, 212, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
