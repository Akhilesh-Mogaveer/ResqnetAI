/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claymorphism Background & Surfaces
        bg: {
          DEFAULT: '#D9E0EC',
          app: '#D9E0EC',
        },
        surface: {
          DEFAULT: '#EDF1F8',
          card: '#EDF1F8',
          elevated: '#F7F9FD',
          well: '#CFD7E6',
          inset: '#CFD7E6',
        },
        // Text tokens (high contrast)
        text: {
          primary: '#111A2B',
          secondary: '#3E4A60',
          muted: '#66718A',
        },
        // Brand Primary & Hover
        brand: {
          50: '#F0F3FD',
          100: '#E1E7FB',
          200: '#C4D0F8',
          300: '#9DB2F3',
          400: '#7390ED',
          500: '#4F6BED',
          600: '#3F57D1',
          700: '#3245B5',
          800: '#273691',
          900: '#1F2B73',
          DEFAULT: '#4F6BED',
          primary: '#4F6BED',
          hover: '#3F57D1',
        },
        // Semantic Severity
        severity: {
          critical: '#E5484D',
          'critical-soft': '#E5484D',
          high: '#F5A524',
          'high-soft': '#F5A524',
          medium: '#4F6BED',
          'medium-soft': '#4F6BED',
          low: '#7B8794',
          'low-soft': '#7B8794',
          success: '#2FB67C',
          'success-soft': '#2FB67C',
        },
        critical: {
          DEFAULT: '#E5484D',
          tint: '#E5484D',
          text: '#FFFFFF',
        },
        high: {
          DEFAULT: '#F5A524',
          tint: '#F5A524',
          text: '#111A2B',
        },
        medium: {
          DEFAULT: '#4F6BED',
          tint: '#4F6BED',
          text: '#FFFFFF',
        },
        low: {
          DEFAULT: '#7B8794',
          tint: '#7B8794',
          text: '#FFFFFF',
        },
        success: {
          DEFAULT: '#2FB67C',
          tint: '#2FB67C',
          text: '#FFFFFF',
        },
        // Backward-compatibility aliases for existing code if needed
        command: {
          bg: '#D9E0EC',
          sidebar: '#EDF1F8',
          card: '#EDF1F8',
          cardElevated: '#F7F9FD',
          border: 'rgba(120, 135, 165, 0.3)',
          borderSubtle: 'rgba(120, 135, 165, 0.2)',
          borderHighlight: '#4F6BED',
        },
        accent: {
          blue: '#4F6BED',
          cyan: '#38A9D6',
          red: '#E5484D',
          amber: '#F5A524',
          green: '#2FB67C',
          purple: '#8C67E8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        'clay-card': '24px',
        'clay-button': '16px',
        'clay-input': '16px',
        'clay-modal': '28px',
        'clay-pill': '9999px',
      },
      boxShadow: {
        'clay-card': '10px 10px 24px rgba(120,135,165,0.45), -8px -8px 20px rgba(255,255,255,0.85), inset 2px 2px 3px rgba(255,255,255,0.7), inset -3px -3px 6px rgba(120,135,165,0.18)',
        'clay-card-hover': '12px 12px 28px rgba(120,135,165,0.50), -10px -10px 24px rgba(255,255,255,0.90), inset 2px 2px 3px rgba(255,255,255,0.8), inset -3px -3px 6px rgba(120,135,165,0.20)',
        'clay-modal': '14px 14px 32px rgba(120,135,165,0.50), -12px -12px 28px rgba(255,255,255,0.90), inset 2px 2px 5px rgba(255,255,255,0.9), inset -2px -2px 6px rgba(120,135,165,0.2)',
        'clay-button': '4px 4px 10px rgba(120,135,165,0.45), -3px -3px 8px rgba(255,255,255,0.85), inset 1.5px 1.5px 3px rgba(255,255,255,0.8), inset -1.5px -1.5px 4px rgba(120,135,165,0.2)',
        'clay-button-active': 'inset 3px 3px 6px rgba(120,135,165,0.45), inset -3px -3px 6px rgba(255,255,255,0.8)',
        'clay-inset': 'inset 5px 5px 10px rgba(120,135,165,0.40), inset -5px -5px 10px rgba(255,255,255,0.80)',
        'clay-pill': '3px 3px 8px rgba(120,135,165,0.40), -2px -2px 6px rgba(255,255,255,0.85), inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 3px rgba(120,135,165,0.2)',
        'clay-primary': '4px 4px 12px rgba(79,107,237,0.45), -3px -3px 8px rgba(255,255,255,0.85), inset 1.5px 1.5px 3px rgba(255,255,255,0.6), inset -1.5px -1.5px 4px rgba(31,43,115,0.3)',
        'clay-primary-active': 'inset 3px 3px 6px rgba(31,43,115,0.5), inset -2px -2px 5px rgba(255,255,255,0.2)',
      },
    },
  },
  plugins: [],
}
