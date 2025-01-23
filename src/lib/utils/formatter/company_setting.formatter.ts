import { ICompanySetting } from '@/interfaces/company_setting';
import { Company, CompanySetting } from '@prisma/client';
import { companySettingOutputSchema } from '@/lib/utils/zod_schema/company_setting';

export function formatCompanySetting(
  companySetting: CompanySetting & { company: Company }
): ICompanySetting {
  const formattedCompanySetting = companySettingOutputSchema.safeParse(companySetting);
  if (!formattedCompanySetting.success) {
    throw new Error('Company setting format failed');
  }
  return formattedCompanySetting.data;
}
