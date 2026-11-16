/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#F97316', 600: '#EA6A0C', 700: '#C2410C' },
        secondary: '#FB923C',
        bg: '#FFF7ED',
        card: '#FFFFFF',
        ink: '#1F2937',
        inksoft: '#6B7280',
        border: '#E5E7EB',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif']
      },
      borderRadius: {
        xl2: '16px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,41,55,0.04)',
        cardhover: '0 8px 24px -8px rgba(249,115,22,0.14), 0 2px 6px rgba(31,41,55,0.04)',
        lg2: '0 20px 48px -16px rgba(249,115,22,0.22), 0 4px 12px rgba(31,41,55,0.06)'
      }
    }
  },
  plugins: []
}
