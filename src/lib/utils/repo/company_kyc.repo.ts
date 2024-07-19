import prisma from '@/client';
import {
  CityOptions,
  CountryOptions,
  IndustryOptions,
  LegalStructureOptions,
  RepresentativeIDType,
} from '@/constants/kyc';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { timestampInSeconds } from '@/lib/utils/common';

export function getEnumValue<T extends object>(enumObj: T, value: string): T[keyof T] | undefined {
  return (Object.values(enumObj) as unknown as string[]).includes(value)
    ? (value as unknown as T[keyof T])
    : undefined;
}
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

  const countryEnumValue = getEnumValue(CountryOptions, country);
  if (!countryEnumValue) {
    throw new Error(`Invalid country value: ${country}`);
  }

  const cityEnumValue = getEnumValue(CityOptions, city);
  if (!cityEnumValue) {
    throw new Error(`Invalid city value: ${city}`);
  }

  const structureEnumValue = getEnumValue(LegalStructureOptions, structure);
  if (!structureEnumValue) {
    throw new Error(`Invalid structure value: ${structure}`);
  }

  const industryEnumValue = getEnumValue(IndustryOptions, industry);
  if (!industryEnumValue) {
    throw new Error(`Invalid industry value: ${industry}`);
  }

  const representativeIdTypeEnumValue = getEnumValue(RepresentativeIDType, representativeIdType);
  if (!representativeIdTypeEnumValue) {
    throw new Error(`Invalid representativeIdType value: ${representativeIdType}`);
  }
  const companyKYC: ICompanyKYC = (await prisma.companyKYC.create({
    data: {
      company: {
        connect: {
          id: companyId,
        },
      },
      legalName,
      country: countryEnumValue,
      city: cityEnumValue,
      address,
      zipCode,
      representativeName,
      structure: structureEnumValue,
      registrationNumber,
      registrationDate,
      industry: industryEnumValue,
      contactPerson,
      contactPhone,
      contactEmail,
      website,
      representativeIdType: representativeIdTypeEnumValue,
      registrationCertificateId,
      taxCertificateId,
      representativeIdCardId,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  })) as ICompanyKYC;

  return companyKYC;
}

export async function deleteCompanyKYC(id: number): Promise<ICompanyKYC> {
  const companyKYC = await prisma.companyKYC.delete({
    where: {
      id,
    },
  });

  return companyKYC as ICompanyKYC;
}
