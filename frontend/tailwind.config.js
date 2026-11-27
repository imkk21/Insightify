/** @type {import('tailwindcss').Config} */
// Design tokens from DESIGN.md: warm neutrals + one red accent, flat, generously rounded.
// colors / borderRadius / boxShadow REPLACE Tailwind's defaults so cool grays and heavy
// shadows can't sneak back in.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      sm: '576px',
      md: '768px',
      lg: '890px',
      xl: '1312px',
      '2xl': '1440px',
      '3xl': '1680px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      plum: '#211922',   // primary text
      olive: '#62625b',  // secondary text
      silver: '#91918c', // muted text, input borders
      pebble: '#bcbcb3', // hover borders
      stone: '#c8c8c1',  // disabled borders
      warm: '#e0e0d9',   // circular buttons, badges
      sand: '#e5e5e0',   // secondary buttons, dividers, tracks
      fog: '#f6f6f3',    // card surfaces
      char: '#33332e',   // dark sections
      brand: { DEFAULT: '#e60023', hover: '#c7001e' }, // primary CTAs only
      forest: '#103c25', // success
      error: '#9e0a0a',
      focus: '#435ee5',
      link: '#2b48d4',
    },
    borderRadius: {
      none: '0',
      sm: '12px',      // small cards, inner tiles
      DEFAULT: '16px', // buttons, inputs
      lg: '20px',      // cards
      xl: '28px',      // large containers
      '2xl': '32px',
      '3xl': '40px',   // hero blocks
      full: '9999px',  // circles only
    },
    boxShadow: {
      none: 'none',
      overlay: '0 8px 32px rgba(33, 25, 34, 0.16)', // floating player / overlays only
    },
    fontFamily: {
      sans: ['Figtree', '-apple-system', 'system-ui', '"Segoe UI"', 'Roboto', 'Oxygen-Sans', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', '"Liberation Mono"', 'monospace'], // code blocks only
    },
    extend: {
      fontSize: {
        display: ['70px', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-1.5px' }],
        section: ['28px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-1.2px' }],
      },
      borderColor: { DEFAULT: '#e5e5e0' },
      ringColor: { DEFAULT: '#435ee5' },
    },
  },
  plugins: [],
};
