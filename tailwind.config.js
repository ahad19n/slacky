/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#0f0f10",
          800: "#1a1a1f",
          700: "#242429",
          600: "#2e2e35",
          500: "#3a3a42",
        },
        accent: {
          DEFAULT: "#7c5cfc",
          hover: "#6b4ef0",
          muted: "#7c5cfc33",
        },
        chalk: {
          DEFAULT: "#e8e6f0",
          muted: "#9896a4",
          faint: "#4a4855",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
