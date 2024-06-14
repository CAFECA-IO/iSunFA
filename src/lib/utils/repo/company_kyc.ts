import prisma from '@/client';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { timestampInSeconds } from '@/lib/utils/common';

export async function createCompanyKYC(
  companyId: number,
  legalName: string,
  country: string,
  city: string,
  address: string,
  zipCode: string,
  representativeName: string,
  structure: string,
  registrationNumber: string,
  registrationDate: string,
  industry: string,
  contactPerson: string,
  contactPhone: string,
  contactEmail: string,
  website: string,
  representativeIdType: string,
  registrationCertificateId: string,
  taxCertificateId: string,
  representativeIdCardId: string
): Promise<ICompanyKYC> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const companyKYC: ICompanyKYC = await prisma.companyKYC.create({
    data: {
      company: {
        connect: {
          id: companyId,
        },
      },
      legalName,
      country,
      city,
      address,
      zipCode,
      representativeName,
      structure,
      registrationNumber,
      registrationDate,
      industry,
      contactPerson,
      contactPhone,
      contactEmail,
      website,
      representativeIdType,
      registrationCertificateId,
      taxCertificateId,
      representativeIdCardId,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });

  return companyKYC;
}
