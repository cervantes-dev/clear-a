/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#800020",
        primaryDark: "#5C001A",
        primaryLight: "#F6E8EC",
        secondary: "#A52A2A",
        accent: "#9E1235",
        background: "#F8F8FA",
        backgroundAlt: "#F5F5F7",
        card: "#FFFFFF",
        divider: "#E9E9EE",
        border: "#ECECF2",
        success: "#2E7D32",
        warning: "#FF9800",
        danger: "#D32F2F",
        text: "#2B2B2B",
        disabled: "#C9B8BD",
        statusPendingBg: "#FFF5E6",
        statusPendingText: "#E69500",
        statusPreparingBg: "#FFF0E8",
        statusPreparingText: "#F26B1D",
        statusReadyBg: "#EAF8EC",
        statusReadyText: "#2E9E44",
      },
    },
  },
  plugins: [],
};