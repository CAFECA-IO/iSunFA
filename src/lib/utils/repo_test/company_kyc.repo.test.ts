import {
  CountryOptions,
  IndustryOptions,
  LegalStructureOptions,
  RepresentativeIDType,
} from '@/constants/kyc';
import { createCompanyKYC, deleteCompanyKYC } from '@/lib/utils/repo/company_kyc.repo';

describe('CompanyKYC Repository Tests', () => {
  const testCompanyId = 1000;
  const newCompanyKYCData = {
    legalName: 'New Legal Name',
    country: CountryOptions.TAIWAN,
    city: 'New City',
    address: 'New Address',
    zipCode: '54321',
    representativeName: 'New Representative',
    structure: LegalStructureOptions.CORPORATION,
    registrationNumber: '987654321',
    registrationDate: '2023-01-02',
    industry: IndustryOptions.FINANCIAL_SERVICES,
    contactPerson: 'Jane Doe',
    contactPhone: '+987654321',
    contactEmail: 'jane.doe@example.com',
    website: 'https://newexample.com',
    representativeIdType: RepresentativeIDType.DRIVER_LICENSE,
    registrationCertificateId: 'newcert123',
    taxCertificateId: 'newtax123',
    representativeIdCardId: 'newid123',
  };

  describe('createCompanyKYC', () => {
    it('should create a new CompanyKYC record', async () => {
      const companyKYC = await createCompanyKYC(
        testCompanyId,
        newCompanyKYCData.legalName,
        newCompanyKYCData.country,
        newCompanyKYCData.city,
        newCompanyKYCData.address,
        newCompanyKYCData.zipCode,
        newCompanyKYCData.representativeName,
        newCompanyKYCData.structure,
        newCompanyKYCData.registrationNumber,
        newCompanyKYCData.registrationDate,
        newCompanyKYCData.industry,
        newCompanyKYCData.contactPerson,
        newCompanyKYCData.contactPhone,
        newCompanyKYCData.contactEmail,
        newCompanyKYCData.website,
        newCompanyKYCData.representativeIdType,
        newCompanyKYCData.registrationCertificateId,
        newCompanyKYCData.taxCertificateId,
        newCompanyKYCData.representativeIdCardId
      );
      await deleteCompanyKYC(companyKYC.id); // Clean up after test
      expect(companyKYC).toBeDefined();
      expect(companyKYC.companyId).toBe(testCompanyId);
      expect(companyKYC.legalName).toBe(newCompanyKYCData.legalName);
      expect(companyKYC.country).toBe(newCompanyKYCData.country);
      expect(companyKYC.city).toBe(newCompanyKYCData.city);
      expect(companyKYC.address).toBe(newCompanyKYCData.address);
      expect(companyKYC.zipCode).toBe(newCompanyKYCData.zipCode);
      expect(companyKYC.representativeName).toBe(newCompanyKYCData.representativeName);
      expect(companyKYC.structure).toBe(newCompanyKYCData.structure);
    });
  });
});
