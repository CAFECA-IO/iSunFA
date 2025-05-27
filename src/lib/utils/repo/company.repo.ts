import prisma from '@/client';
import { AccountBook, Prisma, File, AccountBookSetting } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';

export async function getCompanyById(
  accountBookId: number
): Promise<(AccountBook & { imageFile: File | null }) | null> {
  let company: (AccountBook & { imageFile: File | null }) | null = null;
  if (accountBookId > 0) {
    company = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithSettingById(accountBookId: number): Promise<
  | (AccountBook & {
      imageFile: File | null;
      accountBookSettings: AccountBookSetting[];
    })
  | null
> {
  let company:
    | (AccountBook & {
        imageFile: File | null;
        accountBookSettings: AccountBookSetting[];
      })
    | null = null;
  if (accountBookId > 0) {
    company = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
        accountBookSettings: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithOwner(accountBookId: number): Promise<AccountBook | null> {
  let company: AccountBook | null = null;
  if (accountBookId > 0) {
    company = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return company;
}

export async function updateCompanyById(
  accountBookId: number,
  taxId?: string,
  name?: string,
  imageId?: number
): Promise<AccountBook & { imageFile: File | null }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const company = await prisma.accountBook.update({
    where: {
      id: accountBookId,
    },
    data: {
      taxId,
      name,
      updatedAt: nowTimestamp,
      imageFileId: imageId,
    },
    include: {
      imageFile: true,
    },
  });
  return company;
}

export async function deleteCompanyById(
  accountBookId: number
): Promise<AccountBook & { imageFile: File | null }> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.AccountBookWhereUniqueInput = {
    id: accountBookId,
    OR: [{ deletedAt: 0 }, { deletedAt: null }],
  };

  const data: Prisma.AccountBookUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include = {
    imageFile: true,
  };

  const updateArgs = {
    where,
    data,
    include,
  };

  const company = await prisma.accountBook.update(updateArgs);
  return company;
}

export async function deleteCompanyByIdForTesting(accountBookId: number): Promise<AccountBook> {
  const company = await prisma.accountBook.delete({
    where: {
      id: accountBookId,
    },
  });
  return company;
}

export async function putCompanyIcon(options: { accountBookId: number; fileId: number }) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const { accountBookId, fileId } = options;
  const updatedCompany = await prisma.accountBook.update({
    where: {
      id: accountBookId,
    },
    data: {
      imageFile: {
        connect: {
          id: fileId,
        },
      },
      updatedAt: nowTimestamp,
    },
    include: {
      imageFile: true,
    },
  });
  return updatedCompany;
}
