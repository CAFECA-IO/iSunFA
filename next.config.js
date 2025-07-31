/** @type {import('next').NextConfig} */

// Info: (20240531 - Murky) - Use "lodash-es" for esm support, but eslint doesn't support it, so disable the rule
const cloneDeep = require('lodash/cloneDeep');
const { i18n } = require('./next-i18next.config');

/**
 * echo -n "window['dataLayer'] = window['dataLayer'] || []; function gtag(){window['dataLayer'].push(arguments);} gtag('js', new Date()); gtag('config', 'G-ZNVVW7JP0N');" | openssl dgst -sha256 -binary | openssl base64
 */

// const cspHeader = `
//   default-src 'self';
//   script-src 'self' 'sha256-AWYvreN84Mjp/63ULk+PPMBA9Sgj2Z4oZJASFhXoUJw=' https://www.googletagmanager.com;
//   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
//   img-src 'self' blob: data: https://isunfa.com https://*.googleusercontent.com https://storage.googleapis.com  www.googletagmanager.com;
//   font-src 'self' https://fonts.gstatic.com;
//   object-src 'none';
//   base-uri 'self';
//   form-action 'self';
//   frame-ancestors 'none';
//   upgrade-insecure-requests;
//   connect-src 'self' www.googletagmanager.com http://localhost:3000;
//   `;

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
    FACEBOOK_LINK: process.env.REACT_APP_FACEBOOK_LINK,
    YOUTUBE_LINK: process.env.REACT_APP_YOUTUBE_LINK,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    WEB_URL: process.env.WEB_URL,
  },
  images: {
    loader: 'custom',
    loaderFile: '/src/lib/utils/image_loader.ts',
    domains: ['lh3.googleusercontent.com'], // Info: (20250124 - Julian) 讓 next/image 可以讀取 google storage 的圖片
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
