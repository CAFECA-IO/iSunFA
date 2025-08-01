import loggerBack from '@/lib/utils/logger_back';
import {
  createAccountInPrisma,
  findFirstAccountInPrisma,
  findLatestSubAccountInPrisma,
} from '@/lib/utils/repo/account.repo';
import { Logger } from 'pino';
import { Account as PrismaAccount } from '@prisma/client';

export const accountAPIPostUtils = {
  /**
   * Info: (20241025 - Murky)
   * @description throw StatusMessage as Error, but it can log the errorMessage
   * @param logger - pino Logger
   * @param options - errorMessage and statusMessage
   * @param options.errorMessage - string, message you want to log
   * @param options.statusMessage - string, status message you want to throw
   * @throws Error - statusMessage
   */
  throwErrorAndLog: (
    logger: Logger,
    {
      errorMessage,
      statusMessage,
    }: {
      errorMessage: string;
      statusMessage: string;
    }
  ) => {
    logger.error(errorMessage);
    throw new Error(statusMessage);
  },

  getParentAccountFromPrisma: async (options: { accountId: number; companyId: number }) => {
    const { accountId, companyId } = options;
    const parentAccount = await findFirstAccountInPrisma(accountId, companyId);

    if (!parentAccount) {
      accountAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Parent account with id ${accountId} not found in company ${companyId}`,
        statusMessage: 'Parent account not found',
      });
    }
    return parentAccount!;
  },
  getLastSubAccountFromPrisma: (parentAccount: PrismaAccount) => {
    return findLatestSubAccountInPrisma(parentAccount);
  },
  getNewCode: (options: {
    parentAccount: PrismaAccount;
    latestSubAccount: PrismaAccount | null;
  }) => {
    const { parentAccount, latestSubAccount } = options;
    const parentCode = parentAccount.code;
    let newCode = '';
    if (latestSubAccount) {
      const latestSubAccountCodeParts = latestSubAccount.code.split('-');
      if (latestSubAccountCodeParts.length > 1) {
        const latestSubAccountNumber = Number(latestSubAccountCodeParts.pop());
        newCode = `${parentCode}-${latestSubAccountNumber + 1}`;
      }
    } else {
      newCode = `${parentCode}-1`;
    }
    return newCode;
  },
  getNewName: (options: { parentAccount: PrismaAccount; name: string }) => {
    const { parentAccount, name } = options;
    return `${parentAccount.name}-${name}`;
  },
  createNewSubAccountInPrisma: async (options: {
    parentAccount: PrismaAccount;
    nowInSecond: number;
    companyId: number;
    newCode: string;
    newName: string;
    note: string;
  }) => {
    const { companyId, parentAccount, nowInSecond, newCode, newName, note } = options;
    const newOwnAccount = {
      nowInSecond,
      accountBookId: companyId,
      system: parentAccount.system,
      type: parentAccount.type,
      debit: parentAccount.debit,
      liquidity: parentAccount.liquidity,
      code: newCode,
      name: newName,
      forUser: true,
      parentCode: parentAccount.code,
      rootCode: parentAccount.rootCode,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
      level: parentAccount.level + 1,
      parentId: parentAccount.id,
      rootId: parentAccount.rootId,
      note: note ?? '',
    };

    const newSubAccount = await createAccountInPrisma(newOwnAccount);

    if (!newSubAccount) {
      accountAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Failed to create new sub account for parent account ${parentAccount.id}`,
        statusMessage: 'Failed to create new sub account',
      });
    }

    return newSubAccount;
  },
};
