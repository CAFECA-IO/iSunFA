import { IExperienceDate } from '@/interfaces/experience';

// Info: (20250428 - Julian) --------------- common ---------------
export enum SkillType {
  LANGUAGE = 'Language',
  CERTIFICATE = 'Certificate',
}

// Info: (20250428 - Julian) --------------- Language ---------------
export enum Proficiency {
  ELEMENTARY = 'Elementary',
  LIMITED = 'Limited working',
  PROFESSIONAL = 'Professional working',
  NATIVE = 'Native or bilingual',
}

export interface ILanguageSkill {
  id: number;
  language: string;
  proficiency: keyof typeof Proficiency;
}
export interface ICertificateSkill {
  id: number;
  name: string;
  issuingOrganization: string;
  issueDate: IExperienceDate;
  expirationDate: IExperienceDate;
  certificates: FileList;
}
