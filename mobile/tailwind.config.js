/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          500: "#0B7A6B",
          600: "#085E52",
        },
        secondary: {
          500: "#0FA690",
        },
        accent: {
          500: "#F59E0B",
          700: "#B45309",
        },
        "bg-base": "#F5FAF9",
        surface: "#FFFFFF",
        border: "#E6F7F4",
        "text-primary": "#0F172A",
        "text-muted": "#64748B",
        success: {
          DEFAULT: "#10B981",
          700: "#047857",
        },
        warning: {
          DEFAULT: "#F59E0B",
          700: "#B45309",
        },
        error: {
          DEFAULT: "#EF4444",
          700: "#B91C1C",
        },
        info: {
          DEFAULT: "#3B82F6",
          700: "#1D4ED8",
        },
      },
    },
  },
  plugins: [],
};
