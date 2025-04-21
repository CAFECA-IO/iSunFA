import nodemailer from 'nodemailer';
import { EmailTemplateData, EmailTemplateName } from '@/constants/email_template';
import { getUnixTime } from 'date-fns';
import prisma from '@/client';
import { compileTemplate } from '@/lib/email/template';
import loggerBack from '@/lib/utils/logger_back';

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  auth: {
    user: process.env.MAIL_CLIENT_ID,
    pass: process.env.MAIL_CLIENT_PASSWORD,
  },
});

async function sendPendingEmails() {
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: 'PENDING',
      retry: { lt: 3 },
    },
    take: 50,
  });

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const { id, receiver, template, data, retry, maxRetry, title } = job;
      const now = getUnixTime(new Date());

      try {
        const html = compileTemplate({
          templateName: template as EmailTemplateName,
          data: data as EmailTemplateData[EmailTemplateName],
        });

        await transporter.sendMail({
          from: `"iSunFA" <${process.env.SMTP_EMAIL}>`,
          to: receiver,
          subject: title,
          html,
        });

        await prisma.emailJob.update({
          where: { id },
          data: {
            status: 'SUCCESS',
            updatedAt: now,
          },
        });

        loggerBack.info(`✅ Email sent to ${receiver}`);
      } catch (err) {
        const nextRetry = retry + 1;
        const failed = nextRetry >= maxRetry;

        await prisma.emailJob.update({
          where: { id },
          data: {
            retry: nextRetry,
            status: failed ? 'FAILED' : 'PENDING',
            updatedAt: now,
          },
        });

        loggerBack.error(`❌ Failed to send to ${receiver} (retry ${nextRetry})`, err);
      }
    })
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedCount = results.filter((r) => r.status === 'rejected').length;

  loggerBack.info(`📬 Email job completed. ✅ ${successCount} | ❌ ${failedCount}`);
}

if (require.main === module) {
  sendPendingEmails()
    .then(() => {
      loggerBack.info('📬 Email cron job completed');
      process.exit(0);
    })
    .catch((e) => {
      loggerBack.error('Email cron job failed', e);
      process.exit(1);
    });
}
