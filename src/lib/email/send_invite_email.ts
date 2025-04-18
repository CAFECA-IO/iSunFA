import nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import mustache from 'mustache';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  auth: {
    user: process.env.MAIL_CLIENT_ID, // 建議使用 .env
    pass: process.env.MAIL_CLIENT_PASSWORD,
  },
});

export const sendInviteEmail = async ({
  to,
  inviterName,
  teamName,
  inviteLink,
}: {
  to: string;
  inviterName: string;
  teamName: string;
  inviteLink: string;
}) => {
  const mjmlTemplate = fs.readFileSync(
    path.resolve(process.cwd(), 'src/email/invite.mjml'),
    'utf-8'
  );

  const htmlOutput = mjml2html(
    mustache.render(mjmlTemplate, {
      inviterName,
      teamName,
      inviteLink,
    })
  );

  const info = await transporter.sendMail({
    from: `"iSunFA" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `${inviterName} 邀請您加入 ${teamName}`,
    html: htmlOutput.html,
  });

  return info;
};
