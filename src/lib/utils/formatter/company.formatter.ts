import { KYCStatus } from '@/constants/kyc';
import { ICompany, ICompanyDetail, ICompanyEntity } from '@/interfaces/company';
import { Admin, Company, CompanyKYC, File, Company as PrismaCompany } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { companyEntityValidator } from '@/lib/utils/zod_schema/company';

export async function formatCompanyList(
  companyList: (Company & {
    imageFile: File;
  })[]
): Promise<ICompany[]> {
  const formattedCompanyList: ICompany[] = companyList.map((company) => {
    const formattedCompany: ICompany = {
      ...company,
      imageId: company.imageFile.name,
    };
    return formattedCompany;
  });

  return formattedCompanyList;
}

export function formatCompany(
  company: Company & {
    imageFile: File | null;
  }
): ICompany {
  // Info: (20240830 - Murky) To Emily and Jacky - , File update down below ,it suppose to image name
  const formattedCompany: ICompany = {
    ...company,
    imageId: company?.imageFile?.url || '',
  };
  return formattedCompany;
}

export function formatCompanyDetail(
  company: Company & {
    admins: Admin[];
    companyKYCs: CompanyKYC[];
    imageFile: File | null;
  }
): ICompanyDetail {
  const { admins, companyKYCs, ...companyWithoutAdmins } = company;

  const formattedCompanyDetail: ICompanyDetail = {
    ...companyWithoutAdmins,
    imageId: company?.imageFile?.url || '',
    ownerId: admins[0]?.userId ?? 0,
    kycStatusDetail: companyKYCs[0]?.status ?? KYCStatus.NOT_STARTED,
  };
  return formattedCompanyDetail;
}

/**
 * Info: (20241023 - Murky)
 * @description convert Prisma.Company to ICompanyEntity
 * @note please check companyEntityValidator for how to parse the data
 */
export function parsePrismaCompanyToCompanyEntity(dto: PrismaCompany): ICompanyEntity {
  const { data, success, error } = companyEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('CompanyEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }
  return data;
}
