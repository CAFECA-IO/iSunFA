import nodemailer from 'nodemailer';

type SendTeamInviteEmailParams = {
  to: string;
  inviterName: string;
  teamName: string;
  inviteLink: string;
};

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  auth: {
    user: process.env.MAIL_CLIENT_ID,
    pass: process.env.MAIL_CLIENT_PASSWORD,
  },
});

export const sendTeamInviteEmail = async ({
  to,
  inviterName,
  teamName,
  inviteLink,
}: SendTeamInviteEmailParams) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>${inviterName} 邀請您加入團隊「${teamName}」</h2>
      <p>您好，</p>
      <p><strong>${inviterName}</strong> 剛剛邀請您加入 <strong>${teamName}</strong>，點擊下方按鈕即可加入：</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${inviteLink}" style="background-color: #6366F1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          加入團隊
        </a>
      </p>
      <p>如果您尚未註冊 iSunFA，請使用這封邀請信註冊帳號，系統將自動將您加入團隊。</p>
      <p>如果您無法點擊上方按鈕，請將以下連結複製到瀏覽器中開啟：</p>
      <p><a href="${inviteLink}">${inviteLink}</a></p>
      <hr />
      <p style="font-size: 12px; color: #999;">此為系統自動寄出信件，請勿直接回覆。</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"iSunFA 通知信箱" <${process.env.SMTP_USER}>`,
    to,
    subject: `${inviterName} 邀請您加入團隊「${teamName}」`,
    html: htmlContent,
  });
};
