/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        base:  { DEFAULT: "#0D1117" },
        panel: { DEFAULT: "#161C2D" },
        accent:{ DEFAULT: "#1EC46A", dark: "#19aa59" },
        text:  {
          heading: "#FFFFFF",
          body:    "#B0BAC9",
          muted:   "#6E7681",
        },
        danger: {
          DEFAULT: "#FF4444",
          bgLight: "rgba(255, 68, 68, 0.2)",
          borderLight: "#ff4444"
        }
      },
      borderRadius: { 
        md: "8px", 
        lg: "12px" 
      },
    },
  },
  plugins: [],
}
