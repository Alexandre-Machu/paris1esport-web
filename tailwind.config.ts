import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#19456f',
          accent: '#f7cfe3'
        }
      },
      fontFamily: {
        lexend: ['var(--font-lexend)', 'sans-serif']
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 50% 30%, rgba(247, 207, 227, 0.35), transparent 50%)'
      }
    }
  },
  plugins: []
};

export default config;
