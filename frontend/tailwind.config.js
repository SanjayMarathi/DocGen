/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      // Theme tokens live in index.css as "R G B" channels so opacity modifiers work (text-ink/70).
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(.6)', opacity: .4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        rise: 'rise .35s ease-out both',
        'dot-1': 'bounceDot 1.2s infinite ease-in-out',
        'dot-2': 'bounceDot 1.2s .15s infinite ease-in-out',
        'dot-3': 'bounceDot 1.2s .3s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
