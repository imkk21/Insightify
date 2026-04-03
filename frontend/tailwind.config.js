/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        cardForeground: 'var(--card-foreground)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        ink3: 'var(--ink3)',
        amber: '#e8a030',
        teal2: '#14b8a6',
        rose: '#e05a6a',
        indigo: '#4361b8',
        accent1: 'var(--accent1)',
        accent2: 'var(--accent2)',
      },
      animation: {
        'fade-up':  'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in': 'slideIn 0.5s ease both',
        'pulse-dot':'pulseDot 2s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateY(-12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot:{ '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
    },
  },
  plugins: [],
};
