/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          accent: '#ea6036',
          accentHover: '#d8552e',
          success: '#4fa784',
          muted: '#8f9fb2', // For secondary text
        },
        surface: {
          light: '#f8fafc', // slate-50
          dark: '#090e15',  // Dashboard background
          cardLight: '#ffffff',
          cardDark: '#121b27',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Standardize your sans font
        serif: ['Merriweather', 'serif'], // Standardize your serif headers
      }
    }
  }
}