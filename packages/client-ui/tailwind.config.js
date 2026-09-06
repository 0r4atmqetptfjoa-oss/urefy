/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#090a0c',
        surface: {
          base: '#0d0f12',
          raised: '#13161b',
          overlay: '#191d24',
          highlight: '#222731',
        },
        cyphr: {
          DEFAULT: '#00e5ff',
          glow: 'rgba(0, 229, 255, 0.25)',
        },
        signal: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        aether: {
          DEFAULT: '#7c3aed',
          glow: 'rgba(124, 58, 237, 0.25)',
        },
        crimson: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'cyphr-sm': '0 0 10px rgba(0, 229, 255, 0.2)',
        'aether-sm': '0 0 10px rgba(124, 58, 237, 0.2)',
        'signal-sm': '0 0 10px rgba(16, 185, 129, 0.2)',
      },
      borderWidth: {
        'subtle': '1px',
      }
    },
  },
  safelist: [
    // Mobile tab bar & hamburger — arbitrary values in JS template literals
    // that Tailwind's content scanner may not detect
    'min-w-[44px]',
    'min-h-[44px]',
    'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
    'lg:pb-0',
    'lg:hidden',
  ],
  plugins: [],
}
