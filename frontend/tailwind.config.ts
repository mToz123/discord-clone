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
        discord: {
          dark: '#1e1f22',
          darker: '#2b2d31',
          darkest: '#313338',
          blue: '#5865f2',
          green: '#3ba55d',
          red: '#ed4245',
          gray: '#4e5058',
        },
      },
    },
  },
  plugins: [],
};
export default config;
