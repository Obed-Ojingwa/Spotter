// C:\Users\Melody\Documents\Spotter\frontend\tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          50:  "#fff0f0",
          100: "#ffd6d6",
          200: "#ffadad",
          300: "#ff7b7b",
          400: "#ff4d4d",
          500: "#f72828",
          600: "#e01010",
          700: "#CC0000",
          800: "#990000",
          900: "#7a0000",
          950: "#430000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
