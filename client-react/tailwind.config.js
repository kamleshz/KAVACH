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
          50: '#fff7ed',  // Orange-50
          100: '#ffedd5', // Orange-100
          200: '#fed7aa', // Orange-200
          300: '#fdba74', // Orange-300
          400: '#fb923c', // Orange-400
          500: '#f97316', // Orange-500
          600: '#ea580c', // Orange-600
          700: '#c2410c', // Orange-700
          800: '#9a3412', // Orange-800
          900: '#7c2d12', // Orange-900
          950: '#431407', // Orange-950
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'glow': '0 0 15px rgba(249, 115, 22, 0.5)',
      }
    },
  },
  plugins: [],
}
