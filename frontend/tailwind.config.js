/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bccdff",
          300: "#8ea8ff",
          400: "#5c7cff",
          500: "#3654f7",
          600: "#2538de",
          700: "#1e2bb3",
          800: "#1c298d",
          900: "#1c286f",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(28, 40, 111, 0.08), 0 1px 2px -1px rgba(28, 40, 111, 0.08)",
      },
    },
  },
  plugins: [],
};
