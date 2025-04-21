import { LocaleKey } from '@/constants/normal_setting';
import { TeamRole } from '@/interfaces/team';
import { CompanySetting, Company, File } from '@prisma/client';

export interface ICompanySetting {
  id: number;
  companyId: number;
  companyName: string;
  companyTaxId: string;
  companyStartDate?: number;
  taxSerialNumber: string;
  representativeName: string;
  country: LocaleKey;
  countryCode: LocaleKey;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Info: (20250421 - Shirley) Interface for team member role in company settings context
 */
export interface ITeamMemberRole {
  role: TeamRole;
}

/**
 * Info: (20250421 - Shirley) Interface for team information with members
 */
export interface ITeamInfo {
  id: number;
  name: string;
  ownerId: number;
  members: ITeamMemberRole[];
}

/**
 * Info: (20250421 - Shirley) Interface for company with related entities
 */
export interface ICompanyWithRelations extends Company {
  imageFile?: File;
  team?: ITeamInfo;
}

/**
 * Info: (20250421 - Shirley) Interface for company setting with company relationship
 */
export interface ICompanySettingWithRelations extends CompanySetting {
  company: ICompanyWithRelations;
}
