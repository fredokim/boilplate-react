/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        muted: '#64748b',
        line: '#d8dee8',
        surface: '#f8fafc',
        primary: '#2563eb',
        success: '#168a52',
        danger: '#dc2626',
      },
      boxShadow: {
        focus: '0 0 0 3px rgb(37 99 235 / 0.18)',
      },
    },
  },
  plugins: [],
}
