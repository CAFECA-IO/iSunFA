/** @type {import('next').NextConfig} */

// Info: (20240531 - Murky) - Use "lodash-es" for esm support, but eslint doesn't support it, so disable the rule
// eslint-disable-next-line import/no-extraneous-dependencies
const cloneDeep = require('lodash/cloneDeep');
const { i18n } = require('./next-i18next.config');

// const cspHeader = `
//   default-src 'self';
//   script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googletagmanager.com;
//   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
//   img-src 'self' blob: data: https://isunfa.com https://*.googleusercontent.com https://storage.googleapis.com www.googletagmanager.com;
//   font-src 'self' https://fonts.gstatic.com;
//   object-src 'none';
//   base-uri 'self';
//   form-action 'self';
//   frame-ancestors 'none';
//   upgrade-insecure-requests;
//   connect-src www.googletagmanager.com;
// `;

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
      // {
      //   source: '/(.*)',
      //   headers: [
      //     {
      //       key: 'Content-Security-Policy',
      //       value: cspHeader.replace(/\n/g, ' ').trim(),
      //     },
      //   ],
      // },
    ];
  },
  reactStrictMode: true,
  swcMinify: true,
  i18n,
  env: {
    I_SUN_FA_ADDRESS_IN_ENGLISH: process.env.I_SUN_FA_ADDRESS_IN_ENGLISH,
    I_SUN_FA_ADDRESS_IN_CHINESE: process.env.I_SUN_FA_ADDRESS_IN_CHINESE,
    I_SUN_FA_ADDRESS_ON_GOOGLE_MAP: process.env.I_SUN_FA_ADDRESS_ON_GOOGLE_MAP,
    I_SUN_FA_PHONE_NUMBER: process.env.I_SUN_FA_PHONE_NUMBER,
    GITHUB_LINK: process.env.REACT_APP_GITHUB_LINK,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  },
  images: {
    loader: 'custom',
    loaderFile: '/src/lib/utils/image_loader.js',
  },
  webpack: (config) => {
    const newConfig = cloneDeep(config);
    // Info: (20240502 - Shirley) do as `react-pdf` doc says (https://github.com/wojtekmaj/react-pdf)
    newConfig.resolve.alias.canvas = false;

    // Info: (20240531 - Murky) Fixes npm packages that depend on `fs` module
    newConfig.resolve.fallback = { fs: false };
    return newConfig;
  },
  experimental: {
    instrumentationHook: true, // Info: (20240812 - Murky) this is for function run before server start
  },
};

module.exports = nextConfig;
