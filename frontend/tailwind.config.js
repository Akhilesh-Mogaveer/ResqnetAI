/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#07111F',
          sidebar: '#091629',
          card: '#0D1B2D',
          cardElevated: '#132238',
          border: '#203550',
          borderSubtle: '#162A45',
          borderHighlight: '#2878FF',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          DEFAULT: '#2878FF',
        },
        accent: {
          blue: '#2878FF',
          cyan: '#21D4FD',
          red: '#FF4566',
          amber: '#FFB547',
          green: '#25D6A2',
          purple: '#A78BFA',
        },
        surface: {
          bg: '#07111F',
          card: '#0D1B2D',
          cardHover: '#132238',
          border: '#203550',
          borderSubtle: '#162A45',
        },
        critical: {
          DEFAULT: '#FF4566',
          bg: 'rgba(255, 69, 102, 0.12)',
          border: 'rgba(255, 69, 102, 0.35)',
          text: '#FF6B85',
        },
        warning: {
          DEFAULT: '#FFB547',
          bg: 'rgba(255, 181, 71, 0.12)',
          border: 'rgba(255, 181, 71, 0.35)',
          text: '#FFC875',
        },
        success: {
          DEFAULT: '#25D6A2',
          bg: 'rgba(37, 214, 162, 0.12)',
          border: 'rgba(37, 214, 162, 0.35)',
          text: '#56E6BA',
        },
        info: {
          DEFAULT: '#2878FF',
          bg: 'rgba(40, 120, 255, 0.12)',
          border: 'rgba(40, 120, 255, 0.35)',
          text: '#68A2FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
