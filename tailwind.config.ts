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
          primary: '#2c4a70',
          secondary: '#c8a4c4',
          accent: '#e9ecef',
          warn: '#dc2626',
          success: '#10b981',
          dark: '#1f2937'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif']
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 50% 30%, rgba(44, 74, 112, 0.08), transparent 50%)',
        'gradient-esport': 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 50%, #ffffff 100%)',
        'gradient-accent': 'linear-gradient(120deg, #2c4a70, #c8a4c4)'
      }
    }
  },
  plugins: []
};

export default config;
