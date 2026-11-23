/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f5fa',
          100: '#e2ebf4',
          200: '#c5d8ea',
          300: '#99bcdd',
          400: '#669acc',
          500: '#437cb9',
          600: '#32629b',
          700: '#284e7d',
          800: '#1b3352',
          900: '#0f1f33',
          950: '#0a1422',
        },
        tealAccent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        }
      }
    },
  },
  plugins: [],
}
