import {
  CountryOptions,
  CityOptions,
  LegalStructureOptions,
  IndustryOptions,
  RepresentativeIDType,
  BasicInfoKeys,
  RegistrationInfoKeys,
  ContactInfoKeys,
  UploadDocumentKeys,
} from '@/constants/kyc';

export interface ICompanyKYC {
  id: number;
  companyId: number;
  legalName: string;
  country: CountryOptions;
  city: CityOptions;
  address: string;
  zipCode: string;
  representativeName: string;
  structure: LegalStructureOptions;
  registrationNumber: string;
  registrationDate: string;
  industry: IndustryOptions;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  website: string; // Info: To Jacky, this field is optional (20240719 - Tzuhan)
  representativeIdType: RepresentativeIDType;
  registrationCertificateId: string;
  taxCertificateId: string;
  representativeIdCardId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanyKYCForm {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: string;
  [BasicInfoKeys.CITY]: CityOptions;
  [BasicInfoKeys.ZIP_CODE]: string;
  [BasicInfoKeys.ADDRESS]: string;
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: string;
  [RegistrationInfoKeys.COUNTRY]: CountryOptions;
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: LegalStructureOptions;
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: string;
  [RegistrationInfoKeys.REGISTRATION_DATE]: string;
  [RegistrationInfoKeys.INDUSTRY]: IndustryOptions;
  [ContactInfoKeys.KEY_CONTACT_PERSON]: string;
  [ContactInfoKeys.CONTACT_PHONE]: string;
  [ContactInfoKeys.EMAIL_ADDRESS]: string;
  [ContactInfoKeys.COMPANY_WEBSITE]: string; // Info: To Jacky, this field is optional (20240719 - Tzuhan)
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType;
  registrationCertificateId: string;
  taxCertificateId: string;
  representativeIdCardId: string;
}

export function isCompanyKYC(data: ICompanyKYC): data is ICompanyKYC {
  return (
    typeof data.id === 'number' &&
    typeof data.companyId === 'number' &&
    typeof data.legalName === 'string' &&
    Object.values(CountryOptions).includes(data.country) &&
    Object.values(CityOptions).includes(data.city) &&
    typeof data.address === 'string' &&
    typeof data.zipCode === 'string' &&
    typeof data.representativeName === 'string' &&
    Object.values(LegalStructureOptions).includes(data.structure) &&
    typeof data.registrationNumber === 'string' &&
    typeof data.registrationDate === 'string' &&
    Object.values(IndustryOptions).includes(data.industry) &&
    typeof data.contactPerson === 'string' &&
    typeof data.contactPhone === 'string' &&
    typeof data.contactEmail === 'string' &&
    // (typeof data.website === 'string' || data.website === undefined) && Info: this field shouble be optional, but db schema is not nullable (20240719 - Tzuhan)
    typeof data.website === 'string' &&
    Object.values(RepresentativeIDType).includes(data.representativeIdType) &&
    typeof data.registrationCertificateId === 'string' &&
    typeof data.taxCertificateId === 'string' &&
    typeof data.representativeIdCardId === 'string' &&
    typeof data.createdAt === 'number' &&
    typeof data.updatedAt === 'number'
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
  if (!Object.values(CityOptions).includes(data.city) || !data.city) missingFields.push('city');
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
  if (typeof data.website !== 'string' || !data.website) {
    missingFields.push('website');
  } // Info: this field shouble be optional, but db schema is not nullable (20240719 - Tzuhan)}
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

export function createFormData(data: ICompanyKYCForm): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}
