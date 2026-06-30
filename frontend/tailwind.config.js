/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7f1',
          100: '#c2ebdd',
          200: '#94d9c4',
          300: '#5cc6a8',
          400: '#25d366',
          500: '#00a884',
          600: '#06cf9c',
          700: '#008069',
          800: '#075e54',
          900: '#054c40',
        },
        dark: {
          bg: '#0f172a',
      surface: '#1e293b',
      hover: '#334155',
      border: '#334155',
      text: '#f1f5f9',
      textSecondary: '#94a3b8'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
