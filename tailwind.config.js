/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern "EyeTennis" Palette
        tennis: {
            DEFAULT: '#DFFF00', // Neon tennis ball
            dim: '#B8D900',
        },
        brand: {
            dark: '#0F172A',    // Deep Slate/Navy
            card: '#1E293B',    // Lighter Slate
            surface: '#334155', // UI Elements
        },
        accent: {
            blue: '#38BDF8',    // Hard Court Blue
            orange: '#FB923C',  // Clay Court Orange
            green: '#4ADE80',   // Grass Green
        }
      },
      boxShadow: {
        'neon': '0 0 10px rgba(223, 255, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
