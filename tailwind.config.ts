import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#7c3aed',
        'primary-light': '#a78bfa',
        'accent': '#8b5cf6',
        'accent-light': '#ddd6fe',
        'neutral-soft': '#f9f7ff',
      },
      borderRadius: {
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'sm': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'md': '0 4px 12px 0 rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        'safe': 'max(1rem, env(safe-area-inset-left))',
      },
      fontFamily: {
        'sans': ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
