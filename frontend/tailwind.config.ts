import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: {
          950: '#0b1020',
          900: '#12192f',
          800: '#1c2545'
        },
        mist: '#e7ecff',
        glow: '#7dd3fc',
        accent: '#f59e0b'
      },
      boxShadow: {
        glow: '0 20px 60px rgba(125, 211, 252, 0.12)'
      }
    }
  },
  plugins: []
};

export default config;
