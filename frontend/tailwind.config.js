/** @type {import('tailwindcss').Config} */
// Insightify design tokens: premium dark dev-tool (think Linear / Vercel / Raycast).
// `colors` REPLACES Tailwind's palette so only these semantic tokens exist.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      bg:      '#09090b', // app background
      surface: '#111114', // cards
      raised:  '#18181c', // inputs, hovers, nested surfaces
      overlay: '#1f1f24', // menus, popovers
      line:    'rgba(255,255,255,0.08)', // hairline borders
      'line-strong': 'rgba(255,255,255,0.14)',
      fg:      '#ededef', // primary text
      muted:   '#a1a1aa', // secondary text
      subtle:  '#71717a', // tertiary text, icons
      accent:  { DEFAULT: '#7c5cff', hover: '#8f74ff', soft: 'rgba(124,92,255,0.14)', fg: '#ffffff' },
      success: { DEFAULT: '#3dd68c', soft: 'rgba(61,214,140,0.12)' },
      warning: { DEFAULT: '#f5a524', soft: 'rgba(245,165,36,0.12)' },
      danger:  { DEFAULT: '#f2555a', soft: 'rgba(242,85,90,0.12)' },
      info:    { DEFAULT: '#4cc2ff', soft: 'rgba(76,194,255,0.12)' },
    },
    fontFamily: {
      sans: ['Geist', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
    borderRadius: {
      none: '0', sm: '6px', DEFAULT: '8px', md: '10px', lg: '12px', xl: '16px', '2xl': '20px', full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: '0 1px 2px rgba(0,0,0,0.4)',
      DEFAULT: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)',
      lg: '0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      glow: '0 0 0 1px rgba(124,92,255,0.35), 0 8px 32px -8px rgba(124,92,255,0.45)',
    },
    extend: {
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        display: ['44px', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '600' }],
      },
      borderColor: { DEFAULT: 'rgba(255,255,255,0.08)' },
      ringColor: { DEFAULT: '#7c5cff' },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in 0.3s ease-out both' },
    },
  },
  plugins: [],
};
