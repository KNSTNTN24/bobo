import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bobo: { DEFAULT: "#7c4a2d", light: "#a86b45", dark: "#5d3520" },
      },
    },
  },
  plugins: [],
} satisfies Config;
