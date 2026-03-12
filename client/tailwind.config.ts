import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#eaa0a2',
        'brand-light': '#ffdbdc',
        surface: '#3a4664',
        'surface-light': '#4a5674',
        'surface-dark': '#2d3552',
        muted: '#aaaaaa',
      },
    },
  },
  plugins: [],
};

export default config;
