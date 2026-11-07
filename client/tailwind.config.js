/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#07090e',
          900: '#0d1117',
          850: '#131822',
          800: '#181f2c',
          700: '#242e40',
          600: '#34425a',
          500: '#485b7b',
          accent: '#38bdf8',
          accentGlow: '#0284c7',
          gold: '#f59e0b',
          emerald: '#10b981',
          crimson: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
