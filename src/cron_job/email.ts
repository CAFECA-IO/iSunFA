import { getUnixTime } from 'date-fns';
import { EmailTemplateName, EmailTemplateData } from '@/constants/email_template';
import loggerBack from '@/lib/utils/logger_back';
import { EmailJob } from '@prisma/client';
import prisma from '@/client';
import { sendEmail } from '@/lib/utils/worker/email_sender.worker';

export async function sendEmailJobs() {
  const jobs = await prisma.emailJob.findMany({
    where: { status: 'PENDING', retry: { lt: 3 } },
    take: 50,
  });

  const now = getUnixTime(new Date());

  await Promise.allSettled(
    jobs.map(async (job: EmailJob) => {
      try {
        await sendEmail(
          job.receiver,
          job.title,
          job.template as EmailTemplateName,
          job.data as EmailTemplateData[EmailTemplateName]
        );

        await prisma.emailJob.update({
          where: { id: job.id },
          data: { status: 'SUCCESS', updatedAt: now },
        });

        loggerBack.info(`✅ Email sent to ${job.receiver}`);
      } catch (err) {
        const retry = job.retry + 1;
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            retry,
            status: retry >= job.maxRetry ? 'FAILED' : 'PENDING',
            updatedAt: now,
          },
        });

        loggerBack.error(`❌ Failed to send to ${job.receiver} ${err}`);
      }
    })
  );

  loggerBack.info('📬 Email job complete.');
}

if (require.main === module) {
  // Info: (20250421 - Tzuhan) 每分鐘執行一次
  setInterval(() => {
    sendEmailJobs().catch((err) => {
      loggerBack.error(`Email job failed, ${err}`);
    });
  }, 1000 * 60); // Info: (20250421 - Tzuhan)  1 分鐘 = 60000 ms

  // Info: (20250421 - Tzuhan)  預先跑一次
  sendEmailJobs().catch((err) => {
    loggerBack.error(`Initial email job failed, ${err}`);
  });
}
