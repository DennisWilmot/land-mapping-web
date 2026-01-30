import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        boundary: "#3B82F6",
        parcel: {
          fill: "rgba(20, 184, 166, 0.4)",
          stroke: "#ffffff",
          hover: "rgba(45, 212, 191, 0.6)",
        },
        panel: {
          bg: "rgba(17, 24, 39, 0.85)",
          border: "rgba(75, 85, 99, 0.5)",
        },
      },
      backdropBlur: {
        glass: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
