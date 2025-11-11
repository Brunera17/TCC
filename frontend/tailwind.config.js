/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-blue': {
          DEFAULT: '#2563eb',
          light: '#dbeafe',
          dark: '#1e40af',
        },
        'custom-blue-hover': '#1d4ed8',
      },
    },
  },
  plugins: [],
}