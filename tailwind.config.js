/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // The variables, not the values. These were seven hex literals duplicating
      // what `tokens:build` writes into src/styles/tokens/colors.css, and the
      // duplicate is what the token work exists to remove: changing the source
      // regenerated the CSS and left Tailwind serving the old colour, with
      // check:tokens comparing generated output it had no reason to look at.
      //
      // No opacity modifiers (`text-success/50`) are in use, which is the one
      // thing a var() colour cannot express.
      colors: {
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        line: 'var(--color-line)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
      },
      boxShadow: {
        focus: '0 0 0 3px rgb(37 99 235 / 0.18)',
      },
    },
  },
  plugins: [],
}
