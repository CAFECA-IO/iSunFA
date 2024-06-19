import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Company } from '@prisma/client';
import { timestampInSeconds } from '../common';

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
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const company = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      code,
      name,
      regional,
      updatedAt: nowTimestamp,
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
