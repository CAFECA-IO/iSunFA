import { IAccountBookWithoutTeamEntity, WORK_TAG } from '@/interfaces/account_book';
import { AccountBook, File, AccountBook as PrismaAccountBook } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import {
  accountBookWithoutTeamEntityValidator,
  IAccountBookEntity,
} from '@/lib/utils/zod_schema/account_book';

export async function formatAccountBookList(
  accountBookList: (AccountBook & {
    imageFile: File;
  })[]
): Promise<IAccountBookEntity[]> {
  const formattedAccountBookList: IAccountBookEntity[] = accountBookList.map((accountBook) => {
    const formattedAccountBook: IAccountBookEntity = {
      ...accountBook,
      tag: accountBook.tag as WORK_TAG,
      imageId: accountBook.imageFile.name,
    };
    return formattedAccountBook;
  });

  return formattedAccountBookList;
}

export function formatAccountBook(
  accountBook: AccountBook & {
    imageFile: File | null;
  }
): IAccountBookEntity {
  // Info: (20240830 - Murky) To Emily and Jacky - , File update down below ,it suppose to image name
  const formattedAccountBook: IAccountBookEntity = {
    ...accountBook,
    tag: accountBook.tag as WORK_TAG,
    imageId: accountBook?.imageFile?.url || '',
  };
  return formattedAccountBook;
}

/**
 * Info: (20241023 - Murky)
 * @description convert prisma.accountBook to IAccountBookEntity
 * @note please check accountBookEntityValidator for how to parse the data
 */
export function parsePrismaAccountBookToAccountBookEntity(
  dto: PrismaAccountBook
): IAccountBookWithoutTeamEntity {
  const { data, success, error } = accountBookWithoutTeamEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('AccountBookEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }
  return data;
}
