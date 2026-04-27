import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#141415',
        accent: '#D4537E',
        success: '#1D9E75',
        'text-primary': '#E4E0D8',
        'text-muted': 'rgba(228,224,216,0.4)',
        genre: {
          rock: '#e86042',
          standup: '#d4a820',
          turku: '#1D9E75',
          caz: '#8f88d4',
          solist: '#D4537E',
        },
      },
      fontFamily: {
        bebas: ['var(--font-bebas)', 'Bebas Neue', 'sans-serif'],
        dm: ['var(--font-dm)', 'DM Sans', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(228,224,216,0.1)',
      },
      borderRadius: {
        card: '10px',
        chip: '3px',
      },
    },
  },
  plugins: [],
}

export default config
