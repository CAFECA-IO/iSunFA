export enum CountryOptions {
  DEFAULT = '', // Info: (20240718 - Liz) This is the default value for the dropdown to show placeholder
  TAIWAN = 'Taiwan',
  UNITED_STATES = 'United States',
  CHINA = 'China',
  HONG_KONG = 'Hong Kong',
}

export enum LegalStructureOptions {
  DEFAULT = '', // Info: (20240718 - Liz) This is the default value for the dropdown to show placeholder
  SOLE_PROPRIETORSHIP = 'Sole Proprietorship',
  PARTNERSHIP = 'Partnership',
  CORPORATION = 'Corporation',
  LIMITED_LIABILITY_COMPANY = 'Limited Liability Company',
}

// Info: (20240717 - Liz)  Industry Options
// 1. Accommodation and food services
// 2. Administrative and support services
// 3. Arts and Recreation services
// 4. Basic metal production
// 5. Business franchises
// 6. Chemical substance
// 7. Commerce
// 8. Computer and Electronic Product
// 9. Construction
// 10. Education
// 11. Finance and insurance
// 12. Financial services
// 13. Food industry
// 14. Healthcare and social assistance
// 15. Information
// 16. Mining
// 17. Other service activities
// 18. Personal services
// 19. Real estate activities
// 20. Retail
// 21. Thematic reports
// 22. Transport industry

export enum IndustryOptions {
  DEFAULT = '',
  ACCOMMODATION_AND_FOOD_SERVICES = 'Accommodation and food services',
  ADMINISTRATIVE_AND_SUPPORT_SERVICES = 'Administrative and support services',
  ARTS_AND_RECREATION_SERVICES = 'Arts and Recreation services',
  BASIC_METAL_PRODUCTION = 'Basic metal production',
  BUSINESS_FRANCHISES = 'Business franchises',
  CHEMICAL_SUBSTANCE = 'Chemical substance',
  COMMERCE = 'Commerce',
  COMPUTER_AND_ELECTRONIC_PRODUCT = 'Computer and Electronic Product',
  CONSTRUCTION = 'Construction',
  EDUCATION = 'Education',
  FINANCE_AND_INSURANCE = 'Finance and insurance',
  FINANCIAL_SERVICES = 'Financial services',
  FOOD_INDUSTRY = 'Food industry',
  HEALTHCARE_AND_SOCIAL_ASSISTANCE = 'Healthcare and social assistance',
  INFORMATION = 'Information',
  MINING = 'Mining',
  OTHER_SERVICE_ACTIVITIES = 'Other service activities',
  PERSONAL_SERVICES = 'Personal services',
  REAL_ESTATE_ACTIVITIES = 'Real estate activities',
  RETAIL = 'Retail',
  THEMATIC_REPORTS = 'Thematic reports',
  TRANSPORT_INDUSTRY = 'Transport industry',
}

export enum AreaCodeOptions {
  TAIWAN = '+886',
  UNITED_STATES = '+01',
  HONG_KONG = '+852',
  CHINA = '+86',
}

export enum RepresentativeIDType {
  PASSPORT = 'PASSPORT',
  ID_CARD = 'ID_CARD',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
}

export enum BasicInfoKeys {
  LEGAL_COMPANY_NAME = 'legalName',
  COUNTRY = 'country',
  CITY = 'city',
  ZIP_CODE = 'zipCode',
  ADDRESS = 'address',
  KEY_COMPANY_REPRESENTATIVES_NAME = 'representativeName',
}

export enum RegistrationInfoKeys {
  COUNTRY = 'country',
  LEGAL_STRUCTURE = 'structure',
  BUSINESS_REGISTRATION_NUMBER = 'registrationNumber',
  REGISTRATION_DATE = 'registrationDate',
  INDUSTRY = 'industry',
}

export enum ContactInfoKeys {
  AREA_CODE = 'areaCode',
  CONTACT_NUMBER = 'contactNumber',
  CONTACT_PHONE = 'contactPhone',
  KEY_CONTACT_PERSON = 'contactPerson',
  EMAIL_ADDRESS = 'contactEmail',
  COMPANY_WEBSITE = 'website',
}

export enum UploadDocumentKeys {
  REPRESENTATIVE_ID_TYPE = 'representativeIdType',
  BUSINESS_REGISTRATION_CERTIFICATE_ID = 'registrationCertificateFileId',
  TAX_STATUS_CERTIFICATE_ID = 'taxCertificateFileId',
  REPRESENTATIVE_CERTIFICATE_ID = 'representativeIdCardFileId',
}

export enum KYCStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const MAX_FILE_SIZE_IN_MB = 50;

export const MAX_SIZE_IN_BYTES = 50 * 1024 * 1024; // Info: (20250804 - Shirley) 50MB in bytes

export const sizeFormatter = (size: number): string => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${size} Bytes`;
  }
};

export const KYCFiles = 'KYCFiles';
