import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import jwt from 'jsonwebtoken';
import { ISUNFA_ROUTE } from '@/constants/url';

const generateAppleClientSecret = () => {
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) {
    throw new Error('APPLE_PRIVATE_KEY is not defined');
  }

  const clientSecret = jwt.sign(
    {
      iss: process.env.APPLE_TEAM_ID as string, // Team ID
      iat: Math.floor(Date.now() / 1000), // Current time in seconds
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Expiration time (1 months)
      aud: 'https://appleid.apple.com',
      sub: process.env.APPLE_CLIENT_ID as string, // Service ID
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_KEY_ID as string, // Key ID
      },
    }
  );

  return clientSecret;
};

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: generateAppleClientSecret(),
    }),
  ],
  pages: {
    signIn: ISUNFA_ROUTE.LOGIN_BETA,
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('jwt', token, account, user);
      let newToken = token;
      if (account) {
        newToken = {
          ...token,
          accessToken: account.access_token,
        };
      }
      return newToken;
    },
    async session({ session, token }) {
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('session', session, token);
      const newSession = {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
        },
      };
      return newSession;
    },
  },
});
