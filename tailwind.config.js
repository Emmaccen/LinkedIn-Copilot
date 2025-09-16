/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: [
    "./**/*.tsx",
    "./popup/**/*.{ts,tsx}", // Plasmo popup UI
    "./options/**/*.{ts,tsx}" // Plasmo options page
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        "brand-blue": "oklch(var(--brand-blue) / <alpha-value>)",
        "brand-green": "oklch(var(--brand-green) / <alpha-value>)"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
}
