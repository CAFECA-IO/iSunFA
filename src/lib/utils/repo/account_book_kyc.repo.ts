import prisma from '@/client';
import { KYCStatus } from '@/constants/kyc';
import { SortOrder } from '@/constants/sort';
import { IAccountBookKYCForm } from '@/interfaces/account_book_kyc';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { AccountBookKYC, Prisma } from '@prisma/client';

export async function createAccountBookKYC(
  accountBookId: number,
  companyKYCForm: IAccountBookKYCForm
): Promise<AccountBookKYC> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const companyKYC: AccountBookKYC = await prisma.accountBookKYC.create({
    data: {
      accountBookId,
      legalName: companyKYCForm.legalName,
      city: companyKYCForm.city,
      zipCode: companyKYCForm.zipCode,
      address: companyKYCForm.address,
      representativeName: companyKYCForm.representativeName,
      country: companyKYCForm.country,
      structure: companyKYCForm.structure,
      registrationNumber: companyKYCForm.registrationNumber,
      registrationDate: companyKYCForm.registrationDate,
      industry: companyKYCForm.industry,
      contactPerson: companyKYCForm.contactPerson,
      contactPhone: companyKYCForm.contactPhone,
      contactEmail: companyKYCForm.contactEmail,
      website: companyKYCForm.website,
      representativeIdType: companyKYCForm.representativeIdType,
      registrationCertificateFileId: companyKYCForm.registrationCertificateFileId,
      taxCertificateFileId: companyKYCForm.taxCertificateFileId,
      representativeIdCardFileId: companyKYCForm.representativeIdCardFileId,
      status: KYCStatus.PENDING,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });

  return companyKYC;
}

export async function getAccountBookKYCByCompanyId(
  accountBookId: number
): Promise<AccountBookKYC | null> {
  let companyKYC = null;
  if (accountBookId > 0) {
    companyKYC = await prisma.accountBookKYC.findFirst({
      where: {
        accountBookId,
      },
      orderBy: {
        id: SortOrder.DESC,
      },
    });
  }
  return companyKYC;
}

export async function deleteAccountBookKYC(id: number): Promise<AccountBookKYC> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.AccountBookKYCWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.AccountBookKYCUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    where,
    data,
  };
  const companyKYC = await prisma.accountBookKYC.update(updateArgs);

  return companyKYC;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteAccountBookKYCForTesting(id: number): Promise<AccountBookKYC> {
  const where: Prisma.AccountBookKYCWhereUniqueInput = {
    id,
  };

  const companyKYC = await prisma.accountBookKYC.delete({
    where,
  });

  return companyKYC;
}
