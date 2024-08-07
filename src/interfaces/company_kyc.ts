import {
  CountryOptions,
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
  city: string;
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
  status: string;
  reviewer: string;
  note: string;
  reviewAt: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ICompanyKYCForm {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: string;
  [BasicInfoKeys.CITY]: string;
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
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: string;
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: string;
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: string;
}

export function createFormData(data: ICompanyKYCForm): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}
