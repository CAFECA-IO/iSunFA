import { NextApiRequest, NextApiResponse } from 'next';
import MailService from '@/lib/utils/mail_service';
import { SendMailOptions } from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Info: (20240823 - Julian) 設置郵件內容
      const mailOptions: SendMailOptions = {
        from: process.env.MAIL_CLIENT_ID,
        to: process.env.MAIL_CLIENT_ID,
        subject: 'iSunFA Contact Form',
        text: req.body.comment, // Info: (20240823 - Julian) 純文字
        html: `<p>${req.body.comment}</p>`, // Info: (20240823 - Julian) HTML
      };

      // Info: (20240823 - Julian) 發送郵件
      const mailServiceInstance = MailService.getInstance();
      const success = await mailServiceInstance.sendMail(mailOptions);

      if (success) {
        // Info: (20240823 - Julian) 回應成功
        res.status(200).json({ success: true, message: 'Email sent successfully' });
      } else {
        // Info: (20240823 - Julian) 回應失敗
        res.status(500).json({ success: false, message: 'Email sent failed' });
      }
    } catch (error) {
      // Info: (20240823 - Julian) 回應失敗
      res.status(500).json({ success: false, message: 'Email sent failed' });
    }
  } else {
    // Info: (20240823 - Julian) 回應錯誤
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
