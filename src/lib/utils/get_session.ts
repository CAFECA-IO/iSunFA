import nextSession from 'next-session';

const options = {
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};

export const getSession = nextSession(options);

// export const getSessionWithHandling = async (req: NextApiRequest, res: NextApiResponse) => {
//   const session = await getSession(req, res);

//   // Ensure no undefined values in the session object
//   if (session.cookie && session.cookie.domain === undefined) {
//     session.cookie.domain = null;
//   }

//   return session;
// };
