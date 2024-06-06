export interface ICompanyKYC {
  id: number;
  companyId: number;
  legalName: string;
  country: string;
  city: string;
  address: string;
  zipCode: string;
  representativeName: string;
  structure: string;
  registrationNumber: string;
  registrationDate: string;
  industry: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  representativeIdType: string;
  registrationCertificateId: string;
  taxCertificateId: string;
  representativeIdCardId: string;
  createdAt: number;
  updatedAt: number;
}
