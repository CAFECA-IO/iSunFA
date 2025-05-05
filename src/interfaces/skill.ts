import { IExperienceDate } from '@/interfaces/experience';

// Info: (20250428 - Julian) --------------- common ---------------
export enum SkillType {
  LANGUAGE = 'Language',
  CERTIFICATE = 'Certificate',
}

export enum ModalType {
  CREATE = 'create',
  EDIT = 'edit',
}

// Info: (20250428 - Julian) --------------- Language ---------------
export enum Proficiency {
  ELEMENTARY = 'Elementary',
  LIMITED = 'Limited working',
  PROFESSIONAL = 'Professional working',
  NATIVE = 'Native or bilingual',
}

export interface ILanguageSkillData {
  language: string;
  proficiency: keyof typeof Proficiency;
}

export interface ILanguageSkill extends ILanguageSkillData {
  id: number;
}

export interface ICertificateData {
  name: string;
  issuingOrganization: string;
  issueDate: IExperienceDate;
  expirationDate: IExperienceDate;
  certificates: FileList;
}

export interface ICertificateSkill extends ICertificateData {
  id: number;
}
