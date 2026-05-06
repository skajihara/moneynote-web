import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        xs:   ['1rem',    { lineHeight: '1.5rem' }],     // 16px (was 12px)
        sm:   ['1.125rem',{ lineHeight: '1.75rem' }],    // 18px (was 14px)
        base: ['1.25rem', { lineHeight: '2rem' }],       // 20px (was 16px)
        lg:   ['1.375rem',{ lineHeight: '2rem' }],       // 22px (was 18px)
        xl:   ['1.5rem',  { lineHeight: '2rem' }],       // 24px (was 20px)
        '2xl':['1.75rem', { lineHeight: '2.5rem' }],     // 28px (was 24px)
        '3xl':['2rem',    { lineHeight: '2.5rem' }],     // 32px (was 30px)
        '4xl':['2.5rem',  { lineHeight: '2.75rem' }],    // 40px (was 36px)
        '5xl':['3rem',    { lineHeight: '1' }],          // 48px (unchanged)
      },
    },
  },
  plugins: [],
};

export default config;
