const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#dce3f0',
          200: '#b8c5e0',
          300: '#8a9fc8',
          400: '#5b77ac',
          500: '#3d5a92',
          600: '#2e4677',
          700: '#243861',
          800: '#1a2a4d',
          900: '#0f1c3f', // brand navy
          950: '#09122a',
        },
        amber: {
          ...colors.amber,
          300: '#f7b955',
          400: '#f5a623', // brand amber/gold
          500: '#e0920f',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
