// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      hasReadAgreement: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    hasReadAgreement: boolean;
  }
}
