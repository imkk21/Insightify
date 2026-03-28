/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cream:  '#faf8f3',
        cream2: '#f2ede2',
        ink:    '#1a1714',
        ink2:   '#3d3830',
        ink3:   '#6b6258',
        amber:  '#e8a030',
        amber2: '#f5c05a',
        teal:   '#0f8c7e',
        teal2:  '#14b8a6',
        rose:   '#e05a6a',
        indigo: '#4361b8',
      },
      animation: {
        'fade-up':  'fadeUp 0.5s ease both',
        'slide-in': 'slideIn 0.5s ease both',
        'pulse-dot':'pulseDot 2s infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateY(-12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot:{ '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      },
    },
  },
  plugins: [],
};
