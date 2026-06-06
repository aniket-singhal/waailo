import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5fb',
          100: '#d6e6f4',
          200: '#aecde9',
          500: '#2f72ab',
          600: '#1f5a8f',
          700: '#173f63',
          900: '#16285a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
