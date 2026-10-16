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
          bg: '#070a13',
          card: '#0c1322',
          cardHover: '#111a2e',
          cardBorder: '#1e293b',
          borderSubtle: 'rgba(56, 189, 248, 0.12)',
          accent: '#06b6d4',
          accentGlow: 'rgba(6, 182, 212, 0.25)',
          sidebar: '#080d1a',
          sidebarBorder: '#141d33',
        },
        critical: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.35)',
          bg: 'rgba(239, 68, 68, 0.12)',
        },
        high: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.35)',
          bg: 'rgba(245, 158, 11, 0.12)',
        },
        moderate: {
          DEFAULT: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.35)',
          bg: 'rgba(6, 182, 212, 0.12)',
        },
        low: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
          bg: 'rgba(16, 185, 129, 0.12)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.3)',
        'glow-red': '0 0 15px -3px rgba(239, 68, 68, 0.35)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.35)',
        'card-subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
