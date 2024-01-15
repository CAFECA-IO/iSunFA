/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
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
  },
};

module.exports = nextConfig;
