import { ICompanySetting } from '@/interfaces/company_setting';
import { CompanySetting } from '@prisma/client';
import { CompanySettingSchema } from '@/lib/utils/zod_schema/company_setting';

export function formatCompanySetting(companySetting: CompanySetting): ICompanySetting {
  const formattedCompanySetting = CompanySettingSchema.safeParse(companySetting);
  if (!formattedCompanySetting.success) {
    throw new Error('Company setting format failed');
  }
  return formattedCompanySetting.data;
}
