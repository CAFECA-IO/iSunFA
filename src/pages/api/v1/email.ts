import { NextApiRequest, NextApiResponse } from 'next';
import SendMail from '@/lib/utils/email';

// TODO: temp solution (20240115 - Shirley)
// eslint-disable-next-line @typescript-eslint/naming-convention
type emailConfig = {
  googleClientID: string;
  googleClientPassword: string;
  receiverEmail: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  /* Info: (20230324 - Shirley) read config */
  const config = {
    googleClientID: process.env.GOOGLE_CLIENT_ID,
    googleClientPassword: process.env.GOOGLE_CLIENT_PASSWORD,
    receiverEmail: process.env.REACT_APP_RECEPIENT_EMAIL,
  };

  /* Info: (20230324 - Shirley) send email */
  const { sendMail } = SendMail;
  const sender = sendMail(config as emailConfig, await req.body.comment);

  /* Info: (20230324 - Shirley) return result */
  const result = await sender;

  res.status(200).json(result);
}
