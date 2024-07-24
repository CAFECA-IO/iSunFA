import { ICompany, ICompanyDetail } from '@/interfaces/company';
import { Admin, Company } from '@prisma/client';

export async function formatCompanyList(companyList: Company[]): Promise<ICompany[]> {
  const formattedCompanyList: ICompany[] = companyList.map((company) => {
    const formattedCompany: ICompany = {
      ...company,
      imageId: company.imageId ?? '',
    };
    return formattedCompany;
  });

  return formattedCompanyList;
}

export function formatCompany(company: Company): ICompany {
  const formattedCompany: ICompany = {
    ...company,
    imageId: company.imageId ?? '',
  };
  return formattedCompany;
}

export function formatCompanyDetail(
  company: Company & {
    admins: Admin[];
  }
): ICompanyDetail {
  const { admins, ...companyWithoutAdmins } = company;
  const formattedCompanyDetail: ICompanyDetail = {
    ...companyWithoutAdmins,
    imageId: companyWithoutAdmins.imageId ?? '',
    ownerId: admins[0].userId ?? 0,
  };
  return formattedCompanyDetail;
}
