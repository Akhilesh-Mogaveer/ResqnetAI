/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
          DEFAULT: '#0284c7',
        },
        surface: {
          bg: '#f8fafc',
          card: '#ffffff',
          cardHover: '#f8fafc',
          border: '#e2e8f0',
          borderSubtle: '#f1f5f9',
        },
        critical: {
          DEFAULT: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b',
        },
        warning: {
          DEFAULT: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          text: '#92400e',
        },
        success: {
          DEFAULT: '#16a34a',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          text: '#166534',
        },
        info: {
          DEFAULT: '#0284c7',
          bg: '#f0f9ff',
          border: '#bae6fd',
          text: '#075985',
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
