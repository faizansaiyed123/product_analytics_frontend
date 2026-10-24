/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))", muted: "hsl(var(--muted))", "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))", primary: "hsl(var(--primary))", "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))", danger: "hsl(var(--danger))", success: "hsl(var(--success))", warning: "hsl(var(--warning))",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"], mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
      borderRadius: { DEFAULT: "6px", md: "6px", lg: "8px" },
    },
  },
  plugins: [],
};
