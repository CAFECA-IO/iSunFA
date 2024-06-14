import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Company } from '@prisma/client';

export async function getCompanyById(companyId: number): Promise<Company> {
  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  });
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
): Promise<Company> {
  const company = await prisma.company.update({
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

export async function deleteCompanyById(companyId: number): Promise<Company> {
  const company = await prisma.company.delete({
    where: {
      id: companyId,
    },
  });
  return company;
}
