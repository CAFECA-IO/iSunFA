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
import Zod, { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { zodTimestampInSeconds, nullSchema } from '@/lib/utils/zod_schema/common';

type ZodRawShape = Zod.ZodRawShape;

export const iCompanyKYCFormValidator = z.object({
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: z.string(),
  [BasicInfoKeys.CITY]: z.string(),
  [BasicInfoKeys.ZIP_CODE]: z.string(),
  [BasicInfoKeys.ADDRESS]: z.string(),
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: z.string(),
  [RegistrationInfoKeys.COUNTRY]: z.nativeEnum(CountryOptions),
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: z.nativeEnum(LegalStructureOptions),
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: z.string(),
  [RegistrationInfoKeys.REGISTRATION_DATE]: zodTimestampInSeconds(false).transform(String), // Info: (20240912 - Murky) Date in second but store in string
  [RegistrationInfoKeys.INDUSTRY]: z.nativeEnum(IndustryOptions),
  [ContactInfoKeys.KEY_CONTACT_PERSON]: z.string(),
  [ContactInfoKeys.CONTACT_PHONE]: z.string(),
  [ContactInfoKeys.EMAIL_ADDRESS]: z.string().email(),
  [ContactInfoKeys.COMPANY_WEBSITE]: z.string().optional(),
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: z.nativeEnum(RepresentativeIDType),
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: z.number(),
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: z.number(),
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: z.number(),
});

const kycUploadQueryValidator = z.object({});

const kycUploadBodyValidator = iCompanyKYCFormValidator;

export const kycUploadValidator: IZodValidator<
  (typeof kycUploadQueryValidator)['shape'],
  (typeof kycUploadBodyValidator)['shape']
> = {
  query: kycUploadQueryValidator,
  body: kycUploadBodyValidator,
};

export const iCompanyKYCValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  legalName: z.string(),
  country: z.nativeEnum(CountryOptions),
  city: z.string(),
  address: z.string(),
  zipCode: z.string(),
  representativeName: z.string(),
  structure: z.nativeEnum(LegalStructureOptions),
  registrationNumber: z.string(),
  registrationDate: z.string(),
  industry: z.nativeEnum(IndustryOptions),
  contactPerson: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string().email(),
  website: z.string(),
  representativeIdType: z.nativeEnum(RepresentativeIDType),
  registrationCertificateFileId: z.number(),
  taxCertificateFileId: z.number(),
  representativeIdCardFileId: z.number(),
  status: z.string(),
  reviewer: z.string().nullable(),
  note: z.string().nullable(),
  reviewAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export const kycRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  POST: kycUploadValidator,
};

/**
 * Info: (20250505 - Shirley) KYC Bookkeeper schema for validating request body
 */
const kycBookkeeperBodySchema = z.object({
  name: z.string(),
  birthDate: z.string(),
  email: z.string().email(),
  phone: z.string(),
  qualification: z.boolean(),
  certificationNumber: z.string(),
  personalIdType: z.string(),
  personalIdFileId: z.number(),
  certificationFileId: z.number(),
});

/**
 * Info: (20250505 - Shirley) KYC Bookkeeper schema for validating response
 */
export const kycBookkeeperOutputSchema = kycBookkeeperBodySchema;

/**
 * Info: (20250505 - Shirley) KYC Bookkeeper upload schema
 */
export const kycBookkeeperUploadSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: kycBookkeeperBodySchema,
  },
  outputSchema: kycBookkeeperOutputSchema,
  frontend: nullSchema,
};
