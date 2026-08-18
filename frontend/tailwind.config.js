/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
      },
      fontFamily: {
        sans: ['"Lato"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Adorn Serif"', '"Playfair Display"', '"Cinzel"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Adorn Serif"', '"Playfair Display"', '"Cinzel"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        adorn: ['"Adorn Serif"', '"Playfair Display"', '"Cinzel"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        azonix: ['"Azonix"', 'sans-serif'],
        lato: ['"Lato"', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
