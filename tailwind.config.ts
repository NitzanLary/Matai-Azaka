import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',       // slate-900
          surface: '#1e293b',  // slate-800
          primary: '#3b82f6',  // blue-500
          success: '#22c55e',  // green-500
          error: '#ef4444',    // red-500
          warning: '#f59e0b',  // amber-500
          text: '#f1f5f9',     // slate-100
          muted: '#94a3b8',    // slate-400
        },
      },
    },
  },
  plugins: [],
};

export default config;
