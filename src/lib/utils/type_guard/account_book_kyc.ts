import {
  CountryOptions,
  LegalStructureOptions,
  IndustryOptions,
  RepresentativeIDType,
} from '@/constants/kyc';
import { IAccountBookKYC, IAccountBookKYCForm } from '@/interfaces/account_book_kyc';
import { iCompanyKYCFormValidator, iCompanyKYCValidator } from '@/lib/utils/zod_schema/kyc';

export function isCompanyKYC(data: unknown): data is IAccountBookKYC {
  return iCompanyKYCValidator.safeParse(data).success;
}

export function isCompanyKYCForm(data: unknown): data is IAccountBookKYCForm {
  return iCompanyKYCFormValidator.safeParse(data).success;
}

export function isKYCFormComplete(data: IAccountBookKYCForm): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields = [];
  if (typeof data.legalName !== 'string' || !data.legalName) missingFields.push('legalName');
  if (!Object.values(CountryOptions).includes(data.country) || !data.country) {
    missingFields.push('country');
  }
  if (typeof data.city !== 'string' || !data.city) missingFields.push('city');
  if (typeof data.address !== 'string' || !data.address) missingFields.push('address');
  if (typeof data.zipCode !== 'string' || !data.zipCode) missingFields.push('zipCode');
  if (typeof data.representativeName !== 'string' || !data.representativeName) {
    missingFields.push('representativeName');
  }
  if (!Object.values(LegalStructureOptions).includes(data.structure) || !data.structure) {
    missingFields.push('structure');
  }
  if (typeof data.registrationNumber !== 'string' || !data.registrationNumber) {
    missingFields.push('registrationNumber');
  }
  if (typeof data.registrationDate !== 'string' || !data.registrationDate) {
    missingFields.push('registrationDate');
  }
  if (!Object.values(IndustryOptions).includes(data.industry) || !data.industry) {
    missingFields.push('industry');
  }
  if (typeof data.contactPerson !== 'string' || !data.contactPerson) {
    missingFields.push('contactPerson');
  }
  if (typeof data.contactPhone !== 'string' || !data.contactPhone) {
    missingFields.push('contactPhone');
  }
  if (typeof data.contactEmail !== 'string' || !data.contactEmail) {
    missingFields.push('contactEmail');
  }
  // Info: (20240719 - Tzuhan) this field should be optional, but db schema is not nullable}
  if (
    !Object.values(RepresentativeIDType).includes(data.representativeIdType) ||
    !data.representativeIdType
  ) {
    missingFields.push('representativeIdType');
  }
  if (
    typeof data.registrationCertificateFileId !== 'number' ||
    !data.registrationCertificateFileId
  ) {
    missingFields.push('registrationCertificateFileId');
  }
  if (typeof data.taxCertificateFileId !== 'number' || !data.taxCertificateFileId) {
    missingFields.push('taxCertificateFileId');
  }
  if (typeof data.representativeIdCardFileId !== 'number' || !data.representativeIdCardFileId) {
    missingFields.push('representativeIdCardFileId');
  }
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
