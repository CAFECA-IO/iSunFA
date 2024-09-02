import { KYCStatus } from '@/constants/kyc';
import { ICompany, ICompanyDetail } from '@/interfaces/company';
import { Admin, Company, CompanyKYC, File } from '@prisma/client';

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
