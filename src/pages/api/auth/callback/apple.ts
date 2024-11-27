/* eslint-disable no-console */
// import type { NextApiRequest, NextApiResponse } from 'next';
// import axios from 'axios';
// import { generateAppleClientSecret } from '@/lib/utils/apple_auth';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === 'POST') {
//     const { code, error } = req.body;

//     if (error) {
//       console.error('OAuth error:', error);
//       res.status(400).json({ message: 'OAuth error occurred', error });
//       return;
//     }

//     if (!code) {
//       console.error('Authorization code is missing');
//       res.status(400).json({ message: 'Authorization code is missing' });
//       return;
//     }

//     try {
//       // Exchange authorization code for tokens
//       const clientSecret = generateAppleClientSecret(); // 確保實作此函數
//       const response = await axios.post('https://appleid.apple.com/auth/token', null, {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//         params: {
//           client_id: process.env.APPLE_CLIENT_ID,
//           client_secret: clientSecret,
//           code,
//           grant_type: 'authorization_code',
//           redirect_uri: process.env.APPLE_REDIRECT_URI,
//         },
//       });

//       // Handle tokens (e.g., save to database, set session)
//       res.status(200).json({ message: 'Authorization successful', responseData: response.data });
//     } catch (tokenError) {
//       console.error('Token exchange error:', tokenError);
//       res.status(500).json({ message: 'Token exchange failed', error: tokenError });
//     }
//   } else {
//     res.setHeader('Allow', ['POST']);
//     res.status(405).json({ message: 'Method Not Allowed' });
//   }
// }
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Cookies in callback:', req.cookies);
  res.end();
}
