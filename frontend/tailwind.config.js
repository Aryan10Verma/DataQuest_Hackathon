/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'rgb(var(--void-rgb) / <alpha-value>)',
        deep: 'rgb(var(--deep-rgb) / <alpha-value>)',
        line: 'var(--line)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        part: {
          fit: 'var(--part-fit)',
          market: 'var(--part-market)',
          affordability: 'var(--part-affordability)',
          roi: 'var(--part-roi)',
          family: 'var(--part-family)',
          disruption: 'var(--part-disruption)',
        },
      },
      fontFamily: {
        display: ['var(--serif)'],
        sans: ['var(--sans)'],
      },
      fontSize: {
        // Type scale, ratio 1.333 from 16px.
        xs: ['12px', '1.5'],
        sm: ['14px', '1.55'],
        base: ['16px', '1.6'],
        lg: ['21px', '1.45'],
        xl: ['28px', '1.2'],
        '2xl': ['38px', '1.1'],
        '3xl': ['50px', '1.04'],
        '4xl': ['67px', '1'],
      },
      borderRadius: { panel: '14px' },
      maxWidth: { measure: '68ch' },
    },
  },
  plugins: [],
};
