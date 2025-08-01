import { IAccountBookInfo } from '@/interfaces/account_book_setting';
import { AccountBook, AccountBookSetting } from '@prisma/client';
import { companySettingOutputSchema } from '@/lib/utils/zod_schema/account_book_setting';

export function formatAccountBookInfo(
  accountBook: AccountBookSetting & { accountBook: AccountBook }
): IAccountBookInfo {
  const formattedAccountBook = companySettingOutputSchema.safeParse(accountBook);
  if (!formattedAccountBook.success) {
    throw new Error('Account book info format failed');
  }
  return formattedAccountBook.data;
}
