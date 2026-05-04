import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        setu: {
          navy: "#0B1F3A",
          surface: "#0F2035",
          orange: "#F26419",
          green: "#22B888",
          amber: "#F5A623",
          red: "#E74C3C",
          blue: "#4A90D9",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
