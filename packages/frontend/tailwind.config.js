/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
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
