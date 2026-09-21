/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E1F5EE",
          100: "#C3EBDD",
          200: "#9FE1CB",
          300: "#6FCDAF",
          400: "#3DB08D",
          500: "#1D9E75",
          600: "#15794A",
          700: "#0F6E56",
          800: "#0B5241",
          900: "#083D30",
          DEFAULT: "#0F6E56",
        },
        people: {
          DEFAULT: "#185FA5",
          light: "#E6F1FB",
          border: "#B5D4F4",
        },
        planet: {
          DEFAULT: "#0F6E56",
          light: "#E1F5EE",
          border: "#9FE1CB",
        },
        prosperity: {
          DEFAULT: "#854F0B",
          light: "#FAEEDA",
          border: "#FAC775",
        },
        surface: "#FFFFFF",
        canvas: "#F7F7F5",
        ink: {
          DEFAULT: "#1A1A18",
          secondary: "#5C5C58",
          muted: "#6E6E69",
        },
        danger: {
          DEFAULT: "#A32D2D",
          light: "#FCEBEB",
        },
        success: {
          DEFAULT: "#27500A",
          light: "#EAF3DE",
        },
        warning: {
          DEFAULT: "#633806",
          light: "#FAEEDA",
        },
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["DM Mono", "Fira Mono", "monospace"],
      },
      borderRadius: {
        card: "14px",
        field: "10px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        raised: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        overlay: "0 8px 24px rgba(0,0,0,0.12)",
        elevated: "0 20px 60px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)",
        brand: "0 4px 14px rgba(15,110,86,0.25)",
        "brand-lg": "0 6px 20px rgba(15,110,86,0.35)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)",
        "gradient-mesh":
          "radial-gradient(at 40% 20%, rgba(15,110,86,0.05) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(29,158,117,0.04) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(159,225,203,0.06) 0px, transparent 50%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease both",
        "slide-in-right": "slide-in-right 0.25s ease both",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
      zIndex: {
        drawer: "100",
        modal: "200",
        tooltip: "300",
      },
    },
  },
  plugins: [],
};
