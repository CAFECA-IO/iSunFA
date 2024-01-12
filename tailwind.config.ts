const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      maxWidth: {
        '30ch': '30ch',
      },
      dropShadow: {
        vercelExample: '0 0 0.3rem #ffffff70',
      },
      spacing: {
        '300px': '300px',
        '480px': '480px',
      },
    },
  },
  plugins: [],
};
export default config;
