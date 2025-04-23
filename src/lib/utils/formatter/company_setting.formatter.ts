import { IAccountBookInfo } from '@/interfaces/company_setting';
import { Company, CompanySetting } from '@prisma/client';
import { companySettingOutputSchema } from '@/lib/utils/zod_schema/company_setting';

export function formatAccountBookInfo(
  accountBook: CompanySetting & { company: Company }
): IAccountBookInfo {
  const formattedAccountBook = companySettingOutputSchema.safeParse(accountBook);
  if (!formattedAccountBook.success) {
    throw new Error('Account book info format failed');
  }
  return formattedAccountBook.data;
}
