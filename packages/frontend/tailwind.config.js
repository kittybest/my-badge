/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        card: "linear-gradient(135.45deg, rgba(254, 228, 203, 1), rgba(219, 242, 242, 1))",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["[data-theme=dark]"],
          primary: "#a3ece1",
          secondary: "#52ACBC",
          accent: "#3F3F3F",
          "--rounded-btn": "0.75rem",
        },
      },
    ],
  },
};
