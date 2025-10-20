/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Student Portal Colors (preserved from original)
        'student-primary': '#3498db',
        'student-secondary': '#2c3e50',
        'student-success': '#2ecc71',
        'student-warning': '#f39c12',
        'student-error': '#e74c3c',
        
        // Coach Portal Colors (preserved from original)
        'coach-primary': '#FF4A23',
        'coach-secondary': '#1a1a1a',
        'coach-accent': '#FFE5E0',
        
        // Unified Platform Colors
        'unified-bg': '#f8f9fa',
        'unified-surface': '#ffffff',
        'unified-border': '#e9ecef',
        'unified-text': '#212529',
        'unified-text-secondary': '#6c757d',
      },
      fontFamily: {
        'sans': ['Roboto', 'system-ui', 'sans-serif'],
        'secondary': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}