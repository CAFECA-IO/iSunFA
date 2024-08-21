import {
  BasicInfoKeys,
  ContactInfoKeys,
  CountryOptions,
  IndustryOptions,
  LegalStructureOptions,
  RegistrationInfoKeys,
  RepresentativeIDType,
  UploadDocumentKeys,
} from '@/constants/kyc';
import { ICompanyKYC, ICompanyKYCForm } from '@/interfaces/company_kyc';
import { getEnumValue } from '@/lib/utils/common';
import { CompanyKYC } from '@prisma/client';

export function isCompanyKYC(data: CompanyKYC): data is ICompanyKYC {
  return (
    typeof data.id === 'number' &&
    typeof data.companyId === 'number' &&
    typeof data.legalName === 'string' &&
    Object.values(CountryOptions).includes(data.country as CountryOptions) &&
    typeof data.city === 'string' &&
    typeof data.address === 'string' &&
    typeof data.zipCode === 'string' &&
    typeof data.representativeName === 'string' &&
    Object.values(LegalStructureOptions).includes(data.structure as LegalStructureOptions) &&
    typeof data.registrationNumber === 'string' &&
    typeof data.registrationDate === 'string' &&
    Object.values(IndustryOptions).includes(data.industry as IndustryOptions) &&
    typeof data.contactPerson === 'string' &&
    typeof data.contactPhone === 'string' &&
    typeof data.contactEmail === 'string' &&
    // (typeof data.website === 'string' || data.website === undefined) && Info: this field shouble be optional, but db schema is not nullable (20240719 - Tzuhan)
    typeof data.website === 'string' &&
    Object.values(RepresentativeIDType).includes(
      data.representativeIdType as RepresentativeIDType
    ) &&
    typeof data.registrationCertificateId === 'string' &&
    typeof data.taxCertificateId === 'string' &&
    typeof data.representativeIdCardId === 'string' &&
    typeof data.createdAt === 'number' &&
    typeof data.updatedAt === 'number' &&
    (typeof data.deletedAt === 'number' || data.deletedAt === null)
  );
}

export function isCompanyKYCForm(obj: ICompanyKYCForm): obj is ICompanyKYCForm {
  const countryEnumValue = getEnumValue(CountryOptions, obj.country);
  const structureEnumValue = getEnumValue(LegalStructureOptions, obj.structure);
  const industryEnumValue = getEnumValue(IndustryOptions, obj.industry);
  const representativeIdTypeEnumValue = getEnumValue(
    RepresentativeIDType,
    obj.representativeIdType
  );
  return (
    typeof obj === 'object' &&
    !!countryEnumValue &&
    !!structureEnumValue &&
    !!industryEnumValue &&
    !!representativeIdTypeEnumValue &&
    typeof obj[BasicInfoKeys.LEGAL_COMPANY_NAME] === 'string' &&
    typeof obj[BasicInfoKeys.CITY] === 'string' &&
    typeof obj[BasicInfoKeys.ZIP_CODE] === 'string' &&
    typeof obj[BasicInfoKeys.ADDRESS] === 'string' &&
    typeof obj[BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME] === 'string' &&
    typeof obj[RegistrationInfoKeys.LEGAL_STRUCTURE] === 'string' &&
    typeof obj[RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER] === 'string' &&
    typeof obj[RegistrationInfoKeys.REGISTRATION_DATE] === 'string' &&
    typeof obj[RegistrationInfoKeys.INDUSTRY] === 'string' &&
    typeof obj[ContactInfoKeys.KEY_CONTACT_PERSON] === 'string' &&
    typeof obj[ContactInfoKeys.CONTACT_PHONE] === 'string' &&
    typeof obj[ContactInfoKeys.EMAIL_ADDRESS] === 'string' &&
    typeof obj[ContactInfoKeys.COMPANY_WEBSITE] === 'string' &&
    typeof obj[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE] === 'string' &&
    typeof obj.registrationCertificateId === 'string' &&
    typeof obj.taxCertificateId === 'string' &&
    typeof obj.representativeIdCardId === 'string'
  );
}

export function isKYCFormComplete(data: ICompanyKYCForm): {
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
  // Info: this field should be optional, but db schema is not nullable (20240719 - Tzuhan)}
  if (
    !Object.values(RepresentativeIDType).includes(data.representativeIdType) ||
    !data.representativeIdType
  ) {
    missingFields.push('representativeIdType');
  }
  if (typeof data.registrationCertificateId !== 'string' || !data.registrationCertificateId) {
    missingFields.push('registrationCertificateId');
  }
  if (typeof data.taxCertificateId !== 'string' || !data.taxCertificateId) {
    missingFields.push('taxCertificateId');
  }
  if (typeof data.representativeIdCardId !== 'string' || !data.representativeIdCardId) {
    missingFields.push('representativeIdCardId');
  }
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
