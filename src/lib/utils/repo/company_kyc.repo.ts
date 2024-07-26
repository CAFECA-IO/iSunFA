import prisma from '@/client';
import { ICompanyKYCForm } from '@/interfaces/company_kyc';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { CompanyKYC, Prisma } from '@prisma/client';

export async function createCompanyKYC(
  companyId: number,
  companyKYCForm: ICompanyKYCForm
): Promise<CompanyKYC> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const companyKYC: CompanyKYC = await prisma.companyKYC.create({
    data: {
      company: {
        connect: {
          id: companyId,
        },
      },
      ...companyKYCForm,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });

  return companyKYC;
}

export async function deleteCompanyKYC(id: number): Promise<CompanyKYC> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CompanyKYCWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.CompanyKYCUpdateInput = {
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    where,
    data,
  };
  const companyKYC = await prisma.companyKYC.update(updateArgs);

  return companyKYC;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteCompanyKYCForTesting(id: number): Promise<CompanyKYC> {
  const where: Prisma.CompanyKYCWhereUniqueInput = {
    id,
  };

  const companyKYC = await prisma.companyKYC.delete({
    where,
  });

  return companyKYC;
}
