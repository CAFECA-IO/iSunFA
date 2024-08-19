// Info: [Beta](20240815-Tzuhan) not used but can not remove for custom modification next-auth session type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    expires: string;
    user: {
      id: string;
      hasReadAgreement: boolean;
    } & DefaultSession['user'] ;
  }

  interface User {
    id: string;
    hasReadAgreement: boolean;
  }
}
