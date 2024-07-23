import prisma from '@/client';
import { ICompanyKYCForm } from '@/interfaces/company_kyc';
import { timestampInSeconds } from '@/lib/utils/common';
import { CompanyKYC } from '@prisma/client';

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
  const companyKYC = await prisma.companyKYC.delete({
    where: {
      id,
    },
  });

  return companyKYC;
}
