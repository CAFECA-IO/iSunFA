import prisma from '@/client';
import { KYCStatus } from '@/constants/kyc';
import { SortOrder } from '@/constants/sort';
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
      companyId,
      ...companyKYCForm,
      registrationCertificateFileId: companyKYCForm.registrationCertificateId,
      taxCertificateFileId: companyKYCForm.taxCertificateId,
      representativeIdCardFileId: companyKYCForm.representativeIdCardId,
      status: KYCStatus.PENDING,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });

  return companyKYC;
}

export async function getCompanyKYCByCompanyId(companyId: number): Promise<CompanyKYC | null> {
  let companyKYC = null;
  if (companyId > 0) {
    companyKYC = await prisma.companyKYC.findFirst({
      where: {
        companyId,
      },
      orderBy: {
        id: SortOrder.DESC,
      },
    });
  }
  return companyKYC;
}

export async function deleteCompanyKYC(id: number): Promise<CompanyKYC> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CompanyKYCWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.CompanyKYCUpdateInput = {
    updatedAt: nowInSecond,
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
