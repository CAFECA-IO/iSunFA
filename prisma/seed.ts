import { PrismaClient } from '@prisma/client';
import { timestampInSeconds } from '@/lib/utils/common';
import accounts from './seed_json/account.json';

const prisma = new PrismaClient();
async function main() {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  await Promise.all(
    accounts.map(async (account) => {
      await prisma.account.create({
        data: {
          ...account,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });
    })
  );
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // Info (20240316 - Murky) - Log error and disconnect prisma
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
