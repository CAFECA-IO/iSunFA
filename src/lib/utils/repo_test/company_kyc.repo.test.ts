import {
  CountryOptions,
  IndustryOptions,
  LegalStructureOptions,
  RepresentativeIDType,
} from '@/constants/kyc';
import { createCompanyKYC, deleteCompanyKYCForTesting } from '@/lib/utils/repo/company_kyc.repo';

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

  xdescribe('createCompanyKYC', () => {
    it('should create a new CompanyKYC record', async () => {
      const companyKYC = await createCompanyKYC(testCompanyId, newCompanyKYCData);
      await deleteCompanyKYCForTesting(companyKYC.id); // Clean up after test
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
