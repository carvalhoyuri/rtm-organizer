import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rtm: {
          bg: "#0b0b0f",
          surface: "#16161d",
          border: "#2a2a35",
          text: "#f2f2f5",
          muted: "#9a9aa8",
          accent: "#ff3b5c",
          accent2: "#7c5cff",
          warn: "#ffb020",
        },
      },
    },
  },
  plugins: [],
};

export default config;
