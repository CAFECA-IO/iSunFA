import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Account } from '@prisma/client';

export async function fuzzySearchAccountByName(name: string) {
  let account: Account | null = null;

  try {
    const accounts: Account[] = await prisma.$queryRaw`
      SELECT * FROM public."account"
      ORDER BY SIMILARITY(name, ${name}) DESC
      LIMIT 1;
    `;
    [account] = accounts;
  } catch (error) {
    // Deprecated: （ 20240619 - Murky）Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  return account;
}
