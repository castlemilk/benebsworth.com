import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.{mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0c',
        fg: '#ececf0',
        muted: '#5a5a64',
        blog: '#00e0b8',
        project: '#7c5cff',
        about: '#ff7a59',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
} satisfies Config
