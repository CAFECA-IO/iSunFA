import { ICompany } from '@/interfaces/company';
import { Company } from '@prisma/client';

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

export async function formatCompany(company: Company): Promise<ICompany> {
  const formattedCompany: ICompany = {
    ...company,
    imageId: company.imageId ?? '',
  };
  return formattedCompany;
}
