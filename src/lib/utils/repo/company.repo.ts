import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';

export async function getCompanyById(companyId: number): Promise<ICompany> {
  const company: ICompany = (await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  })) as ICompany;
  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return company;
}

export async function updateCompanyById(
  companyId: number,
  code: string,
  name: string,
  regional: string
): Promise<ICompany> {
  const company: ICompany = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      code,
      name,
      regional,
    },
  });
  return company;
}

export async function deleteCompanyById(companyId: number): Promise<ICompany> {
  const company: ICompany = await prisma.company.delete({
    where: {
      id: companyId,
    },
  });
  return company;
}
