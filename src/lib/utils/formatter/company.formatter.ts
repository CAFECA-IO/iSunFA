import { ICompanyEntity, WORK_TAG } from '@/interfaces/account_book';
import { AccountBook, File, AccountBook as PrismaAccountBook } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { accountBookEntityValidator } from '@/lib/utils/zod_schema/company';
import { IAccountBookEntity } from '@/lib/utils/zod_schema/account_book';

export async function formatCompanyList(
  companyList: (AccountBook & {
    imageFile: File;
  })[]
): Promise<IAccountBookEntity[]> {
  const formattedCompanyList: IAccountBookEntity[] = companyList.map((company) => {
    const formattedCompany: IAccountBookEntity = {
      ...company,
      tag: company.tag as WORK_TAG,
      imageId: company.imageFile.name,
    };
    return formattedCompany;
  });

  return formattedCompanyList;
}

export function formatCompany(
  company: AccountBook & {
    imageFile: File | null;
  }
): IAccountBookEntity {
  // Info: (20240830 - Murky) To Emily and Jacky - , File update down below ,it suppose to image name
  const formattedCompany: IAccountBookEntity = {
    ...company,
    tag: company.tag as WORK_TAG,
    imageId: company?.imageFile?.url || '',
  };
  return formattedCompany;
}

/**
 * Info: (20241023 - Murky)
 * @description convert prisma.accountBook to ICompanyEntity
 * @note please check companyEntityValidator for how to parse the data
 */
export function parsePrismaCompanyToCompanyEntity(dto: PrismaAccountBook): ICompanyEntity {
  const { data, success, error } = accountBookEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('CompanyEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }
  return data;
}
